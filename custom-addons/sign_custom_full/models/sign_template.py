from odoo import models, fields

class SignTemplate(models.Model):
    _name = 'sign.template'
    _description = 'Signature Template'
    
    name = fields.Char(required=True)
    active = fields.Boolean(default=True)
