package com.smartitt.common.util;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class PasswordGenerator {

    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude I, O to prevent confusion
    private static final String LOWER = "abcdefghijkmnopqrstuvwxyz"; // exclude l
    private static final String DIGITS = "23456789";                 // exclude 0, 1
    private static final String SPECIAL = "!@#$%&*";
    private static final String ALL = UPPER + LOWER + DIGITS + SPECIAL;

    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Generates a 10-character random password meeting complexity rules.
     */
    public static String generateTemporaryPassword() {
        return generate(10);
    }

    public static String generate(int length) {
        if (length < 8) length = 10;

        List<Character> chars = new ArrayList<>();
        chars.add(UPPER.charAt(RANDOM.nextInt(UPPER.length())));
        chars.add(LOWER.charAt(RANDOM.nextInt(LOWER.length())));
        chars.add(DIGITS.charAt(RANDOM.nextInt(DIGITS.length())));
        chars.add(SPECIAL.charAt(RANDOM.nextInt(SPECIAL.length())));

        for (int i = 4; i < length; i++) {
            chars.add(ALL.charAt(RANDOM.nextInt(ALL.length())));
        }

        Collections.shuffle(chars, RANDOM);

        StringBuilder sb = new StringBuilder(length);
        for (char c : chars) {
            sb.append(c);
        }
        return sb.toString();
    }
}
