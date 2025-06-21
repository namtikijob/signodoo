from odoo import models, fields

class SignField(models.Model):
    _name = 'sign.field'
    _description = 'Signature Field Type'
    
    name = fields.Char(required=True)
    type = fields.Selection([
        ('text', 'Text'),
        ('signature', 'Signature'),
        ('date', 'Date'),
        ('checkbox', 'Checkbox'),
    ], required=True, default='text')