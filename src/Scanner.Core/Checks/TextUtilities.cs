namespace Scanner.Core.Checks;

public static class TextUtilities
{
    public static int GetLineNumber(string content, int index)
    {
        if (index <= 0)
        {
            return 1;
        }

        var line = 1;
        for (var i = 0; i < content.Length && i < index; i++)
        {
            if (content[i] == '\n')
            {
                line++;
            }
        }

        return line;
    }

    public static bool ContainsAttribute(string attributes, string attributeName)
    {
        return attributes.Contains(attributeName + "=", StringComparison.OrdinalIgnoreCase);
    }
}
