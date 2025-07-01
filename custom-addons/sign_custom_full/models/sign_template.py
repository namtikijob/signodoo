from odoo import models, fields, api
import logging

_logger = logging.getLogger(__name__)

class SignTemplate(models.Model):
    _name = 'sign.template'
    _description = 'Signature Template'
    
    name = fields.Char(required=True)
    active = fields.Boolean(default=True)
    
    document = fields.Binary("PDF File", attachment=True)
    document_filename = fields.Char("File Name")
    
    field_ids = fields.One2many('sign.field', 'template_id', string="Fields")
    ref_model_id = fields.Many2one('ir.model', string="Linked Model")
    
    def get_available_roles(self):
        """ Trả về danh sách role đang tồn tại trong hệ thống """
        return self.env['sign.role'].search([])
    
    @api.model_create_multi
    def create(self, vals_list):
        """Override create để tự động set filename, hỗ trợ batch creation"""
        for vals in vals_list:
            # Tự động set filename từ context nếu có
            if vals.get('document') and not vals.get('document_filename'):
                # Odoo thường pass filename qua context khi upload file
                filename = self._context.get('default_document_filename') or \
                          self._context.get('filename') or \
                          'document.pdf'
                vals['document_filename'] = filename
            
        return super().create(vals_list)
    
    def write(self, vals):
        """Override write để update filename khi thay đổi document"""
        # Nếu có document mới nhưng không có filename
        if vals.get('document'):
            if not vals.get('document_filename'):
                # Lấy filename từ context
                filename = self._context.get('default_document_filename') or \
                          self._context.get('filename')
                if filename:
                    vals['document_filename'] = filename
                elif not self.document_filename:
                    # Nếu không có filename cũ thì set default
                    vals['document_filename'] = 'document.pdf'
        
        return super().write(vals)
    
    @api.onchange('document')
    def _onchange_document(self):
        """Onchange để update filename khi upload file mới"""
        if self.document:
            # Thử lấy filename từ context
            filename = self._context.get('default_document_filename') or \
                      self._context.get('filename')
            if filename:
                self.document_filename = filename
    
    def action_configure_template(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_url',
            'url': f'/sign_custom/configure/template/{self.id}',
            'target': 'self',
        }
    
    def action_preview_pdf(self):
        """Action để preview PDF"""
        self.ensure_one()
        if not self.document:
            return {'type': 'ir.actions.client', 'tag': 'display_notification',
                   'params': {'message': 'No PDF document found!', 'type': 'warning'}}
        
        return {
            'type': 'ir.actions.act_url',
            'url': f'/sign_custom/template/pdf/{self.id}',
            'target': 'new',
        }