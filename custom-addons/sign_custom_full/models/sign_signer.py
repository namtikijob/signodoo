from odoo import models, fields
import uuid

class SignRequestSigner(models.Model):
    _name = 'sign.request.signer'
    _description = 'Signer of Sign Request'

    request_id = fields.Many2one('sign.request', required=True)
    partner_id = fields.Many2one('res.partner', required=True)
    role_id = fields.Many2one('sign.role')
    access_token = fields.Char(default=lambda self: uuid.uuid4().hex)
    signature = fields.Binary()
    signed_on = fields.Datetime()

    def get_portal_url(self):
        self.ensure_one()
        base_url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')
        return f"{base_url}/sign/document/{self.id}/{self.access_token}"

