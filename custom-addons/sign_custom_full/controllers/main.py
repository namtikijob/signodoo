import logging

import base64
from odoo import http, fields
from odoo.http import request

_logger = logging.getLogger(__name__)
class SignController(http.Controller):
    
    @http.route('/sign/document/<int:signer_id>/<string:token>', type='http', auth='public', website=True)
    def document_sign(self, signer_id, token, **kwargs):
        signer = request.env['sign.request.signer'].sudo().browse(signer_id)
        if not signer.exists() or signer.access_token != token:
            return request.not_found()
        
        return request.render('sign_custom_full.portal_sign_document', {
            'signer': signer,
            'request': signer.request_id,
        })
    
    @http.route('/sign/submit', type='json', auth='public', website=True)
    def submit_signature(self, signer_id, token, signature_data, **kwargs):
        signer = request.env['sign.request.signer'].sudo().browse(signer_id)
        if not signer.exists() or signer.access_token != token:
            return {'error': 'Invalid request'}
        
        signer.write({
            'signature': signature_data,
            'signed_on': fields.Datetime.now(),
        })
        
        # Kiểm tra tất cả signer đã ký chưa
        request_obj = signer.request_id
        all_signed = all(s.signed_on for s in request_obj.signer_ids)
        
        if all_signed:
            request_obj.state = 'signed'
        
        return {'success': True}


class SignCustomController(http.Controller):
    
    @http.route('/sign_custom/template/pdf/<int:template_id>', type='http', auth='user')
    def serve_template_pdf(self, template_id):
        print(f"Request received for template_id: {template_id}")  # Debug log
        
        template = request.env['sign.template'].sudo().browse(template_id)
        if not template.exists() or not template.document:
            print(f"Template not found or no document: exists={template.exists()}, has_document={bool(template.document)}")
            return request.not_found()
        
        # Decode base64
        try:
            pdf_data = base64.b64decode(template.document)
            print(f"PDF decoded successfully, bytes length: {len(pdf_data)}")  # Debug log
        except Exception as e:
            print(f"PDF decode error: {e}")  # Debug log
            return request.make_response("PDF decode error", [('Content-Type', 'text/plain')])
        
        filename = template.document_filename or "document.pdf"
        print(f"Serving PDF with filename: {filename}")  # Debug log
        
        # Xử lý filename có ký tự Unicode
        try:
            # Thử encode filename as ASCII
            filename.encode('ascii')
            disposition = f'inline; filename="{filename}"'
        except UnicodeEncodeError:
            # Nếu có ký tự Unicode, sử dụng RFC 5987 format
            import urllib.parse
            filename_encoded = urllib.parse.quote(filename.encode('utf-8'))
            disposition = f"inline; filename*=UTF-8''{filename_encoded}"
        
        return request.make_response(pdf_data, headers=[
            ('Content-Type', 'application/pdf'),
            ('Content-Disposition', disposition)
        ])
    
    @http.route('/sign_custom/configure/template/<int:template_id>', type='http', auth='user', website=True)
    def configure_template(self, template_id, **kwargs):
        template = request.env['sign.template'].sudo().browse(template_id)
        if not template.exists():
            return request.not_found()
        
        return request.render('sign_custom_full.configure_template_page', {
            'template': template,
        })

    @http.route('/sign_custom/template/available_fields', type='json', auth='user')
    def get_available_fields(self):
        # Truy vấn các field mẫu chưa gắn template (dùng như thư viện)
        fields = request.env['sign.field'].sudo().search([('template_id', '=', False)])
        
        return [{
            'id': field.id,
            'name': field.name,
            'type': field.type,
        } for field in fields]
    
    @http.route('/sign_custom/template/get_fields', type='json', auth='user')
    def get_template_fields(self, **kwargs):
        try:
            _logger.info("get_template_fields params: %s", kwargs)
            
            template_id = kwargs.get('template_id')
            if not template_id:
                return {'error': 'Missing template_id parameter'}
            
            template = request.env['sign.template'].sudo().browse(int(template_id))
            if not template.exists():
                return {'error': 'Template not found'}
            
            fields = []
            for field in template.field_ids:
                fields.append({
                    'id': field.id,
                    'name': field.name,
                    'type': field.type,
                    'posX': field.posX,
                    'posY': field.posY,
                    'page': field.page,

                })
            
            return {'success': True, 'fields': fields}
        
        except Exception as e:
            _logger.error("Error in get_template_fields: %s", str(e))
            return {'success': False, 'error': str(e)}

    @http.route('/sign_custom/template/add_field', type='json', auth='user')     
    def add_field_to_template(self, **kwargs):
        try:
            # Debug: in ra tất cả tham số nhận được
            _logger.info("add_field_to_template params: %s", kwargs)
            
            template_id = kwargs.get('template_id')
            field_id = kwargs.get('field_id')
            posX = kwargs.get('posX')
            posY = kwargs.get('posY')
            page = kwargs.get('page')
            
            # Kiểm tra tham số bắt buộc
            if not all([template_id, field_id, posX is not None, posY is not None, page is not None]):
                return {'error': 'Missing required parameters'}
            
            field_template = request.env['sign.field'].sudo().browse(int(field_id))
            if not field_template.exists():
                return {'error': 'Invalid field'}

            # Clone field và gắn template_id + vị trí
            new_field = field_template.copy({
                'template_id': template_id,
                'posX': posX,
                'posY': posY,
                'page': page,
            })
            return {'success': True, 'field_id': new_field.id}
            
        except Exception as e:
            _logger.error("Error in add_field_to_template: %s", str(e))
            return {'error': str(e)}


    @http.route('/sign_custom/template/delete_field', type='json', auth='user')
    def delete_field(self, **kwargs):
        try:
            template_id = kwargs.get('template_id')
            field_id = kwargs.get('field_id')
            
            if not template_id or not field_id:
                return {'error': 'Missing required parameters'}
                
            field = request.env['sign.field'].sudo().browse(int(field_id))
            if field.exists() and field.template_id.id == int(template_id):
                field.unlink()
                return {'success': True}
            else:
                return {'error': 'Field not found or access denied'}
                
        except Exception as e:
            return {'error': str(e)}

    
    @http.route('/sign_custom/template/update_field_position', type='json', auth='user')
    def update_field_position(self, **kwargs):
        try:
            _logger.info("update_field_position params: %s", kwargs)
            
            template_id = kwargs.get('template_id')
            field_id = kwargs.get('field_id')
            posX = kwargs.get('posX')
            posY = kwargs.get('posY')
            page = kwargs.get('page')
            
            if not all([template_id, field_id, posX is not None, posY is not None, page is not None]):
                return {'error': 'Missing required parameters'}
            
            field = request.env['sign.field'].sudo().browse(int(field_id))
            if not field.exists() or field.template_id.id != int(template_id):
                return {'error': 'Field not found or access denied'}
            
            field.write({
                'posX': posX,
                'posY': posY,
                'page': page,
            })
            return {'success': True, 'field_id': field.id}
            
        except Exception as e:
            _logger.error("Error in update_field_position: %s", str(e))
            return {'error': str(e)}