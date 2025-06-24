from odoo import models, fields

class SignRequest(models.Model):
    _name = 'sign.request'
    _description = 'Signature Request'
    
    name = fields.Char(required=True)
    template_id = fields.Many2one('sign.template') 
    signer_ids = fields.One2many('sign.request.signer', 'request_id', string="Signers")
    state = fields.Selection([
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('signed', 'Fully Signed')
    ], default='draft')


    def action_send_sign_requests(self):
        template = self.env.ref('sign_custom_full.sign_request_signer_email')
        for request in self:
            for signer in request.signer_ids:
                template.send_mail(signer.id, force_send=True)
            request.state = 'sent'
