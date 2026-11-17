package run.halo.e2e.core;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Small JSON reader/writer for the E2E fixtures. It intentionally supports only the
 * subset needed by these tests (objects, arrays, strings, numbers, booleans, null) so
 * the E2E module does not pull a JSON library into the build.
 */
public final class Json {

    private Json() {}

    public static Object parse(String json) {
        Parser parser = new Parser(json);
        Object value = parser.readValue();
        parser.skipWhitespace();
        if (!parser.atEnd()) {
            throw new IllegalArgumentException("Trailing JSON content at offset " + parser.pos);
        }
        return value;
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> parseObject(String json) {
        Object value = parse(json);
        if (!(value instanceof Map<?, ?> map)) {
            throw new IllegalArgumentException("Expected JSON object but got " + value);
        }
        return (Map<String, Object>) map;
    }

    public static String write(Object value) {
        StringBuilder builder = new StringBuilder();
        writeValue(builder, value);
        return builder.toString();
    }

    @SuppressWarnings("unchecked")
    public static Object path(Object root, String dottedPath) {
        Object current = root;
        for (String segment : dottedPath.split("\\.")) {
            if (current instanceof Map<?, ?> map) {
                current = ((Map<String, Object>) map).get(segment);
            } else if (current instanceof List<?> list) {
                current = list.get(Integer.parseInt(segment));
            } else {
                return null;
            }
        }
        return current;
    }

    public static String string(Object root, String dottedPath) {
        Object value = path(root, dottedPath);
        return value == null ? null : String.valueOf(value);
    }

    private static void writeValue(StringBuilder builder, Object value) {
        if (value == null) {
            builder.append("null");
        } else if (value instanceof String string) {
            writeString(builder, string);
        } else if (value instanceof Number || value instanceof Boolean) {
            builder.append(value);
        } else if (value instanceof Map<?, ?> map) {
            builder.append('{');
            boolean first = true;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (!first) {
                    builder.append(',');
                }
                first = false;
                writeString(builder, String.valueOf(entry.getKey()));
                builder.append(':');
                writeValue(builder, entry.getValue());
            }
            builder.append('}');
        } else if (value instanceof List<?> list) {
            builder.append('[');
            for (int i = 0; i < list.size(); i++) {
                if (i > 0) {
                    builder.append(',');
                }
                writeValue(builder, list.get(i));
            }
            builder.append(']');
        } else {
            writeString(builder, value.toString());
        }
    }

    private static void writeString(StringBuilder builder, String value) {
        builder.append('"');
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '"' -> builder.append("\\\"");
                case '\\' -> builder.append("\\\\");
                case '\n' -> builder.append("\\n");
                case '\r' -> builder.append("\\r");
                case '\t' -> builder.append("\\t");
                default -> {
                    if (c < 0x20) {
                        builder.append(String.format("\\u%04x", (int) c));
                    } else {
                        builder.append(c);
                    }
                }
            }
        }
        builder.append('"');
    }

    private static final class Parser {
        private final String text;
        private int pos;

        Parser(String text) {
            this.text = text;
        }

        boolean atEnd() {
            return pos >= text.length();
        }

        void skipWhitespace() {
            while (pos < text.length() && Character.isWhitespace(text.charAt(pos))) {
                pos++;
            }
        }

        Object readValue() {
            skipWhitespace();
            if (atEnd()) {
                throw new IllegalArgumentException("Unexpected end of JSON");
            }
            char c = text.charAt(pos);
            return switch (c) {
                case '{' -> readObject();
                case '[' -> readArray();
                case '"' -> readString();
                case 't' -> readLiteral("true", Boolean.TRUE);
                case 'f' -> readLiteral("false", Boolean.FALSE);
                case 'n' -> readLiteral("null", null);
                default -> readNumber();
            };
        }

        private Map<String, Object> readObject() {
            Map<String, Object> map = new LinkedHashMap<>();
            expect('{');
            skipWhitespace();
            if (peek() == '}') {
                pos++;
                return map;
            }
            while (true) {
                skipWhitespace();
                String key = readString();
                skipWhitespace();
                expect(':');
                map.put(key, readValue());
                skipWhitespace();
                char next = next();
                if (next == '}') {
                    return map;
                }
                if (next != ',') {
                    throw new IllegalArgumentException("Expected ',' or '}' at offset " + pos);
                }
            }
        }

        private List<Object> readArray() {
            List<Object> list = new ArrayList<>();
            expect('[');
            skipWhitespace();
            if (peek() == ']') {
                pos++;
                return list;
            }
            while (true) {
                list.add(readValue());
                skipWhitespace();
                char next = next();
                if (next == ']') {
                    return list;
                }
                if (next != ',') {
                    throw new IllegalArgumentException("Expected ',' or ']' at offset " + pos);
                }
            }
        }

        private String readString() {
            expect('"');
            StringBuilder builder = new StringBuilder();
            while (!atEnd()) {
                char c = next();
                if (c == '"') {
                    return builder.toString();
                }
                if (c != '\\') {
                    builder.append(c);
                    continue;
                }
                char escaped = next();
                switch (escaped) {
                    case '"' -> builder.append('"');
                    case '\\' -> builder.append('\\');
                    case '/' -> builder.append('/');
                    case 'b' -> builder.append('\b');
                    case 'f' -> builder.append('\f');
                    case 'n' -> builder.append('\n');
                    case 'r' -> builder.append('\r');
                    case 't' -> builder.append('\t');
                    case 'u' -> {
                        String hex = text.substring(pos, pos + 4);
                        builder.append((char) Integer.parseInt(hex, 16));
                        pos += 4;
                    }
                    default -> throw new IllegalArgumentException("Invalid escape \\" + escaped);
                }
            }
            throw new IllegalArgumentException("Unterminated string");
        }

        private Object readNumber() {
            int start = pos;
            while (!atEnd() && "+-0123456789.eE".indexOf(text.charAt(pos)) >= 0) {
                pos++;
            }
            String number = text.substring(start, pos);
            if (number.contains(".") || number.contains("e") || number.contains("E")) {
                return Double.parseDouble(number);
            }
            return Long.parseLong(number);
        }

        private Object readLiteral(String literal, Object value) {
            if (!text.startsWith(literal, pos)) {
                throw new IllegalArgumentException("Unexpected token at offset " + pos);
            }
            pos += literal.length();
            return value;
        }

        private char peek() {
            if (atEnd()) {
                throw new IllegalArgumentException("Unexpected end of JSON");
            }
            return text.charAt(pos);
        }

        private char next() {
            char c = peek();
            pos++;
            return c;
        }

        private void expect(char expected) {
            char c = next();
            if (c != expected) {
                throw new IllegalArgumentException("Expected '" + expected + "' but got '" + c + "' at offset " + (pos - 1));
            }
        }
    }
}
