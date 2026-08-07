const awsmobile = {
    "aws_project_region": "us-east-1",
    "aws_cognito_region": "us-east-1",
    "aws_user_pools_id": "us-east-1_LYQyjkS3r",
    "aws_user_pools_web_client_id": "7e9clbctcf40t6qu1a7ivto96v",
    "oauth": {
        "domain": "splitify-auth-v2-832439451819.auth.us-east-1.amazoncognito.com",
        "scope": [
            "email",
            "openid",
            "profile"
        ],
        "redirectSignIn": "http://localhost:8081,splitify://",
        "redirectSignOut": "http://localhost:8081,splitify://",
        "responseType": "code"
    },
    "federationTarget": "COGNITO_USER_POOLS",
    "aws_cognito_username_attributes": [
        "EMAIL"
    ],
    "aws_cognito_social_providers": [
        "GOOGLE",
        "FACEBOOK",
        "APPLE"
    ],
    "aws_cognito_signup_attributes": [
        "EMAIL"
    ],
    "aws_cognito_mfa_configuration": "OFF",
    "aws_cognito_mfa_types": [
        "SMS"
    ],
    "aws_cognito_password_protection_settings": {
        "passwordPolicyMinLength": 8,
        "passwordPolicyCharacters": []
    },
    "aws_cognito_verification_mechanisms": [
        "EMAIL"
    ]
};

export default awsmobile;
