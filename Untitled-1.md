root@racknerd-1f3588a:~/zabiya-backend/api-code# cat .env
DATABASE_URL=postgresql://zabiya_admin:local_dev_password@postgres-local:5432/zabiya_db?schema=public
# Your Local Secret Pepper (Make up a random string)
ALIAS_PEPPER="local_testing_pepper_8475938475"

# Your Local Encryption Key (Must be exactly 32 hex characters)
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"



# Security
JWT_SECRET="make_up_a_long_random_string_here"
PORT=3000
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:8080, https://zabiya.com, https://www.zabiya.com, http://localhost:3000, https://hulum-admin-dashboard.vercel.app"

# Telegram
TELEGRAM_BOT_TOKEN="8523288066:AAGmtHAoWE1yYcVDN8o0_3j164hwMTd-JUM"
TELEGRAM_WEBHOOK_SECRET="zabiya_super_secret_123" # Must match what you typed in Step 3!

NEST_JUNIOR_TELEGRAM_BOT_TOKEN="8718150357:AAGR4x3tlLhPdzNfFXJljyxGzf2xrqSLJCo"
# ArifPay (Mock for now)
ARIFPAY_API_KEY="Ih2qwpS0UojUXj00d0FiK0r1btUe9j6u"
ARIFPAY_WEBHOOK_SECRET="mock_secret"

ARIFPAY_BASE_URL="https://gateway.arifpay.net"

ARIFPAY_BASE_URL = 'https://gateway.arifpay.net'
API_BASE_URL = 'https://api.zabiya.com'
APP_BASE_URL = 'https://zabiya.com'

FRONTEND_URL="https://zabiya.com"

ADMIN_PASSWORD = "Muse_ejig_Mistr-123"

HMS_ACCESS_KEY= "684d9285bd0dab5f9a012869"
HMS_SECRET="nMFsjRgsnyfnHZfF9KQAVBem6753627VfaGbAWiqhbjuAuTK9Vupi3RXnb2gZhf4tMcuz6XCEwxRcERP11AJujV2gzBdcCgFNlFAdfoyWS1kluyfm4M7Xu47ToPbuSSPnbxSsHF56WKMZO4Z-ZzLBPOOTPY0Umgpm-21hSxEX7E="

NEST_JUNIOR_BOT_TOKEN="8718150357:AAGR4x3tlLhPdzNfFXJljyxGzf2xrqSLJCo"
PUBLIC_URL=https://api.zabiya.com