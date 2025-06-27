from odoo import models, fields

class SignTemplateGenerateMulti(models.TransientModel):
    _name = 'sign.template.generate.multi'
    _description = 'Sign Template Generate Multi'

    template_id = fields.Many2one('sign.template', string="Template", required=True)
    message = fields.Text()

    def action_generate(self):
        active_model = self.env.context.get('active_model')
        active_ids = self.env.context.get('active_ids')

        if not active_model or not active_ids:
            return

        records = self.env[active_model].browse(active_ids)

        for record in records:
            template = self.template_id

            request = self.env['sign.request'].create({
                'name': f"{template.name} for {record.display_name}",
                'template_id': template.id,
            })

            for field in template.field_ids:
                if field.role_id.partner_selection == 'fixed':
                    partner = field.role_id.default_partner_id
                elif field.role_id.partner_selection == 'select':
                    partner = record.user_id.partner_id if hasattr(record, 'user_id') else None
                else:
                    partner = None  # chưa xử lý expression

                if partner:
                    self.env['sign.request.signer'].create({
                        'request_id': request.id,
                        'partner_id': partner.id,
                        'role_id': field.role_id.id,
                    })

        return {'type': 'ir.actions.act_window_close'}
