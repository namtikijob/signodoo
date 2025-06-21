from odoo import models, fields, api

class SignRole(models.Model):
    _name = 'sign.role'
    _description = 'Signature Role'
    
    name = fields.Char(required=True)
    default_partner_id = fields.Many2one('res.partner')
    partner_selection = fields.Selection([
        ('fixed', 'Fixed Partner'),
        ('select', 'Select Manually'),
        ('expression', 'Python Expression'),
    ], default='select')
    python_expression = fields.Text()