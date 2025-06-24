from odoo import http
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
