<?php
// api/utils/jwt.php
// Standalone Secure JWT implementation in PHP without external dependencies

class JWT {
    private static $secret = 'voting_system_secret_key_super_secure_2026_jwt';

    public static function encode($payload, $expDays = 7) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload['iat'] = time();
        $payload['exp'] = time() + ($expDays * 24 * 60 * 60);
        $payloadJson = json_encode($payload);

        $base64UrlHeader = self::base64UrlEncode($header);
        $base64UrlPayload = self::base64UrlEncode($payloadJson);

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$secret, true);
        $base64UrlSignature = self::base64UrlEncode($signature);

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function decode($jwt) {
        if (!$jwt) return null;
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) return null;

        list($header64, $payload64, $sig64) = $parts;

        $sig = self::base64UrlDecode($sig64);
        $expectedSig = hash_hmac('sha256', $header64 . "." . $payload64, self::$secret, true);

        if (!hash_equals($expectedSig, $sig)) {
            return null; // invalid signature
        }

        $payload = json_decode(self::base64UrlDecode($payload64), true);
        if (!$payload) return null;

        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null; // expired
        }

        return $payload;
    }

    private static function base64UrlEncode($data) {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }

    private static function base64UrlDecode($data) {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
    }
}

