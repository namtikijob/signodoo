from odoo import models, fields, api

class SignTemplateGenerate(models.TransientModel):
    _name = 'sign.template.generate'
    _description = 'Generate Signature Request from Template'
    
    template_id = fields.Many2one('sign.template', required=True)
    signer_ids = fields.One2many('sign.template.generate.signer', 'wizard_id')
    
    def action_generate(self):
        request = self.env['sign.request'].create({
            'template_id': self.template_id.id,
            'name': self.template_id.name,
            'data': self.template_id.data,
            'signer_ids': [(0, 0, {
                'partner_id': signer.partner_id.id,
                'role_id': signer.role_id.id,
            }) for signer in self.signer_ids]
        })
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'sign.request',
            'res_id': request.id,
            'view_mode': 'form',
        }

class SignTemplateGenerateSigner(models.TransientModel):
    _name = 'sign.template.generate.signer'
    _description = 'Template Signer Wizard'
    
    wizard_id = fields.Many2one('sign.template.generate')
    role_id = fields.Many2one('sign.role', required=True)
    partner_id = fields.Many2one('res.partner', required=True)

class SignTemplateGenerateMulti(models.TransientModel):
    _name = 'sign.template.generate.multi'
    _description = 'Generate Multiple Signature Requests from Template'

    template_id = fields.Many2one('sign.template', required=True)
    res_model = fields.Char("Model")
    res_ids = fields.Many2many('ir.model.data', string="Selected Records")  # hoặc tạo Many2many dynamic

    def action_generate_requests(self):
        self.ensure_one()
        template = self.template_id

        # Bước 1: lấy fields trong template
        fields = template.field_ids

        # Bước 2: xử lý cho từng bản ghi gốc
        for record in self.env[self.res_model].browse(self._context.get('active_ids', [])):
            signers = []
            for field in fields:
                role = field.role_id
                partner = None

                if role.partner_selection == 'fixed':
                    partner = role.default_partner_id
                elif role.partner_selection == 'select':
                    # ví dụ: lấy đối tượng record làm người ký nếu có trường partner_id
                    if hasattr(record, 'partner_id'):
                        partner = record.partner_id
                    elif hasattr(record, 'user_id'):
                        partner = record.user_id.partner_id
                elif role.partner_selection == 'expression':
                    try:
                        # Cảnh báo: sử dụng eval có rủi ro
                        env = {'object': record, 'user': self.env.user, 'env': self.env}
                        partner = eval(role.python_expression, env)
                    except Exception as e:
                        raise UserError(f"Invalid Python Expression in role '{role.name}': {e}")

                if not partner:
                    continue  # hoặc raise lỗi tùy logic

                signers.append((0, 0, {
                    'partner_id': partner.id,
                    'role_id': role.id,
                }))

            # Bước 3: tạo sign.request
            request = self.env['sign.request'].create({
                'name': f'{template.name} - {record.display_name}',
                'template_id': template.id,
                'signer_ids': signers,
            })

        return {'type': 'ir.actions.act_window_close'}
