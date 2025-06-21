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