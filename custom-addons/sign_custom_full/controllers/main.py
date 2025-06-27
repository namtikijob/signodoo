import base64
from odoo import http, fields
from odoo.http import request


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