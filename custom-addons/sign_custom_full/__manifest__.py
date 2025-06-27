{
    'name': 'Sign Custom Full',
    'version': '1.0.0',
    'summary': 'Electronic Signature',
    'sequence': 100,
    'category': 'Tools',
    'description': "Full featured electronic signature system",
    'depends': ['base', 'mail', 'web'],
    'data': [
        'security/ir.model.access.csv',
        'views/sign_request_views.xml',
        'views/sign_request_actions.xml',
        'views/sign_template_views.xml',
        'data/email_templates.xml',

        'views/menu_views.xml',  
        'views/sign_signer_views.xml',
        # 'templates/assets.xml',
        'templates/configure_template_page.xml',
        

        
    ],

    'installable': True,
    'application': True,
    'license': 'AGPL-3',

}