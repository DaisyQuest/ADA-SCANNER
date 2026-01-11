import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

public class CliLauncher {
    private static String usage() {
        return "Usage: CliLauncher [-p|--port <port>] [-h|--headless] [-t|--tool <listen|sca>] [-- <sca args>]";
    }

    private static boolean isWindows() {
        return System.getProperty("os.name").toLowerCase().contains("win");
    }

    private static Path scriptDirectory() throws URISyntaxException {
        Path location = Paths.get(CliLauncher.class.getProtectionDomain().getCodeSource().getLocation().toURI());
        if (Files.isRegularFile(location)) {
            return location.getParent();
        }
        return location;
    }

    private static Path resolveScript(String base) throws URISyntaxException {
        String extension = isWindows() ? ".bat" : ".sh";
        return scriptDirectory().resolve(base + extension);
    }

    public static void main(String[] args) throws IOException, URISyntaxException, InterruptedException {
        String tool = null;
        String port = null;
        boolean headless = false;
        List<String> scaArgs = new ArrayList<>();
        boolean stopParsing = false;

        for (int i = 0; i < args.length; i++) {
            String arg = args[i];
            switch (arg) {
                case "-t":
                case "--tool":
                    if (i + 1 >= args.length) {
                        System.err.println("Missing value for " + arg + ".");
                        System.err.println(usage());
                        System.exit(2);
                    }
                    tool = args[++i];
                    if ("sca".equals(tool)) {
                        for (int j = i + 1; j < args.length; j++) {
                            scaArgs.add(args[j]);
                        }
                        stopParsing = true;
                    }
                    break;
                case "-p":
                case "--port":
                    if (i + 1 >= args.length) {
                        System.err.println("Missing value for " + arg + ".");
                        System.err.println(usage());
                        System.exit(2);
                    }
                    port = args[++i];
                    break;
                case "-h":
                case "--headless":
                    headless = true;
                    break;
                case "--":
                    for (int j = i + 1; j < args.length; j++) {
                        scaArgs.add(args[j]);
                    }
                    stopParsing = true;
                    break;
                case "--help":
                    System.out.println(usage());
                    return;
                default:
                    System.err.println("Unknown option: " + arg);
                    System.err.println(usage());
                    System.exit(2);
            }
            if (stopParsing) {
                break;
            }
        }

        if (tool == null) {
            tool = "listen";
        }

        if (port != null && !port.matches("\\d+")) {
            System.err.println("Port must be a number.");
            System.exit(2);
        }

        System.out.println("ADA Scanner CLI Launcher");
        System.out.println("Selected tool: " + tool);

        if ("sca".equals(tool)) {
            if (!scaArgs.isEmpty() && "--".equals(scaArgs.get(0))) {
                scaArgs.remove(0);
            }
            if (port != null || headless) {
                System.err.println("Warning: --port/--headless ignored for sca.");
            }
            if (scaArgs.isEmpty()) {
                System.out.println("Static analysis args: (none)");
            } else {
                System.out.println("Static analysis args: " + String.join(" ", scaArgs));
            }
            Path script = resolveScript("sca");
            List<String> command = new ArrayList<>();
            command.add(script.toString());
            command.addAll(scaArgs);
            Process process = new ProcessBuilder(command).inheritIO().start();
            System.exit(process.waitFor());
        }

        if ("listen".equals(tool)) {
            if (port != null) {
                System.out.println("Port override: " + port);
            } else {
                System.out.println("Port override: (default)");
            }
            if (headless) {
                System.out.println("Headless: enabled (monitoring console disabled).");
            } else {
                System.out.println("Headless: disabled");
            }
            Path script = resolveScript("listen");
            List<String> command = new ArrayList<>();
            command.add(script.toString());
            if (port != null) {
                command.add("--port");
                command.add(port);
            }
            if (headless) {
                command.add("--headless");
            }
            Process process = new ProcessBuilder(command).inheritIO().start();
            System.exit(process.waitFor());
        }

        System.err.println("Unknown tool: " + tool + " (expected listen or sca).");
        System.exit(2);
    }
}
