from odoo import models, fields, api

class SignRole(models.Model):
    _name = 'sign.role'
    _description = 'Signature Role'

    name = fields.Char(required=True)

    partner_selection = fields.Selection([
        ('empty', 'Empty'),
        ('fixed', 'Default'),
        ('expression', 'Python Expression'),
    ], default='empty', string="Partner Selection Policy")

    default_partner_id = fields.Many2one('res.partner', string="Default Partner")
    python_expression = fields.Text(string="Python Expression")

    def get_default_partner(self, linked_record=None):
        self.ensure_one()
        if self.partner_selection == 'fixed':
            return self.default_partner_id
        elif self.partner_selection == 'expression' and self.python_expression and linked_record:
            try:
                localdict = {'object': linked_record}
                return eval(self.python_expression, {}, localdict)
            except Exception:
                return None
        return None
