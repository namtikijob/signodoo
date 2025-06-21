from odoo import models, fields

class SignRequest(models.Model):
    _name = 'sign.request'
    _description = 'Signature Request'
    
    name = fields.Char(required=True)
    template_id = fields.Many2one('sign.template')  # Thêm dòng này