from odoo import models, fields, api

class SignField(models.Model):
    _name = 'sign.field'
    _description = 'Signature Field'

    name = fields.Char(string="Field Name", required=True)
    type = fields.Selection([
        ('signature', 'Signature'),
        ('text', 'Text'),
        ('date', 'Date'),
        ('checkbox', 'Checkbox'),
        ('selection', 'Selection'),
    ], string="Field Type", required=True, default='signature')
    
    # Các field khác để dành cho tương lai (optional)
    template_id = fields.Many2one('sign.template', string="Template", ondelete='cascade')
    role_id = fields.Many2one('sign.role', string="Role")
    page = fields.Integer(string="Page", default=1)
    width = fields.Float(string="Width", default=0.1)
    height = fields.Float(string="Height", default=0.05)
    posX = fields.Float(string="Position X")
    posY = fields.Float(string="Position Y")

    required = fields.Boolean(string="Required", default=True)
    active = fields.Boolean(string="Active", default=True)

    def action_save_and_close(self):
        """Action để save và đóng popup form"""
        return {'type': 'ir.actions.act_window_close'}