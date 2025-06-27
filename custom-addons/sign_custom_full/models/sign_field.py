from odoo import models, fields

class SignField(models.Model):
    _name = 'sign.field'
    _description = 'Signature Field'

    name = fields.Char(string="Field Name")
    template_id = fields.Many2one('sign.template', required=True, ondelete='cascade', string="Template")
    role_id = fields.Many2one('sign.role', string="Role")
    type = fields.Selection([
        ('signature', 'Signature'),
        ('text', 'Text'),
        ('date', 'Date'),
    ], required=True, default='signature')
    page = fields.Integer(string="Page", default=1)
    posX = fields.Float(string="Position X")
    posY = fields.Float(string="Position Y")
    required = fields.Boolean(string="Required", default=True)
