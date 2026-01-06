namespace Scanner.Runtime.AspNetCore;

internal sealed class CappedTeeStream : Stream
{
    private readonly Stream _inner;
    private readonly MemoryStream _buffer;
    private readonly int _maxBytes;

    public CappedTeeStream(Stream inner, int maxBytes)
    {
        _inner = inner;
        _maxBytes = Math.Max(0, maxBytes);
        _buffer = new MemoryStream();
    }

    public bool IsTruncated { get; private set; }

    public byte[] GetCapturedBytes() => _buffer.ToArray();

    public override bool CanRead => false;
    public override bool CanSeek => false;
    public override bool CanWrite => true;
    public override long Length => _inner.Length;
    public override long Position
    {
        get => _inner.Position;
        set => throw new NotSupportedException();
    }

    public override void Flush()
    {
        _inner.Flush();
    }

    public override Task FlushAsync(CancellationToken cancellationToken)
    {
        return _inner.FlushAsync(cancellationToken);
    }

    public override int Read(byte[] buffer, int offset, int count)
    {
        throw new NotSupportedException();
    }

    public override long Seek(long offset, SeekOrigin origin)
    {
        throw new NotSupportedException();
    }

    public override void SetLength(long value)
    {
        _inner.SetLength(value);
    }

    public override void Write(byte[] buffer, int offset, int count)
    {
        _inner.Write(buffer, offset, count);
        Capture(buffer.AsSpan(offset, count));
    }

    public override async ValueTask WriteAsync(ReadOnlyMemory<byte> buffer, CancellationToken cancellationToken = default)
    {
        await _inner.WriteAsync(buffer, cancellationToken).ConfigureAwait(false);
        Capture(buffer.Span);
    }

    public override async Task WriteAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
    {
        await _inner.WriteAsync(buffer.AsMemory(offset, count), cancellationToken).ConfigureAwait(false);
        Capture(buffer.AsSpan(offset, count));
    }

    private void Capture(ReadOnlySpan<byte> data)
    {
        if (_maxBytes <= 0 || IsTruncated)
        {
            IsTruncated = true;
            return;
        }

        var remaining = _maxBytes - (int)_buffer.Length;
        if (remaining <= 0)
        {
            IsTruncated = true;
            return;
        }

        var toWrite = Math.Min(remaining, data.Length);
        _buffer.Write(data[..toWrite]);
        if (toWrite < data.Length)
        {
            IsTruncated = true;
        }
    }
}
