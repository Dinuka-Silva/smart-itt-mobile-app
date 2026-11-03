package com.smartitt.container.service;

import java.util.Map;

public class Iso6346Validator {

    private static final Map<Character, Integer> CHAR_VALUES = Map.ofEntries(
            Map.entry('A', 10), Map.entry('B', 12), Map.entry('C', 13), Map.entry('D', 14),
            Map.entry('E', 15), Map.entry('F', 16), Map.entry('G', 17), Map.entry('H', 18),
            Map.entry('I', 19), Map.entry('J', 20), Map.entry('K', 21), Map.entry('L', 23),
            Map.entry('M', 24), Map.entry('N', 25), Map.entry('O', 26), Map.entry('P', 27),
            Map.entry('Q', 28), Map.entry('R', 29), Map.entry('S', 30), Map.entry('T', 31),
            Map.entry('U', 32), Map.entry('V', 34), Map.entry('W', 35), Map.entry('X', 36),
            Map.entry('Y', 37), Map.entry('Z', 38)
    );

    public static String normalize(String containerNumber) {
        if (containerNumber == null) return "";
        String clean = containerNumber.replaceAll("[^A-Za-z0-9]", "").toUpperCase().trim();
        return clean.length() > 11 ? clean.substring(0, 11) : clean;
    }

    public static boolean hasTypoInDigits(String containerNumber) {
        if (containerNumber == null) return false;
        String clean = containerNumber.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        if (clean.length() > 4) {
            int end = Math.min(clean.length(), 10);
            String digitPortion = clean.substring(4, end);
            return digitPortion.contains("O") || digitPortion.contains("I");
        }
        return false;
    }

    public static boolean isValidFormat(String containerNumber) {
        String clean = normalize(containerNumber);
        if (clean.length() != 11) return false;
        // 3 owner letters + U/J/Z category letter + 6 serial digits + 1 check digit
        return clean.matches("^[A-Z]{3}[UJZ]\\d{7}$");
    }

    public static int calculateCheckDigit(String containerNumber) {
        String clean = normalize(containerNumber);
        if (clean.length() < 10) return -1;

        int sum = 0;
        for (int i = 0; i < 10; i++) {
            char ch = clean.charAt(i);
            int value;
            if (Character.isLetter(ch)) {
                value = CHAR_VALUES.getOrDefault(ch, 0);
            } else if (Character.isDigit(ch)) {
                value = Character.getNumericValue(ch);
            } else {
                return -1;
            }
            int weight = (int) Math.pow(2, i);
            sum += value * weight;
        }

        int remainder = sum % 11;
        return remainder % 10; // 10 -> 0 per standard
    }

    public static boolean isValidCheckDigit(String containerNumber) {
        if (!isValidFormat(containerNumber)) return false;
        String clean = normalize(containerNumber);
        int expected = calculateCheckDigit(clean);
        int actual = Character.getNumericValue(clean.charAt(10));
        return expected == actual;
    }

    public static String suggestValidContainerNumber(String containerNumber) {
        String clean = normalize(containerNumber);
        if (clean.length() >= 10 && clean.substring(0, 4).matches("^[A-Z]{3}[UJZ]$") && clean.substring(4, 10).matches("^\\d{6}$")) {
            int expected = calculateCheckDigit(clean.substring(0, 10));
            if (expected >= 0) {
                return clean.substring(0, 10) + expected;
            }
        }
        return null;
    }
}
