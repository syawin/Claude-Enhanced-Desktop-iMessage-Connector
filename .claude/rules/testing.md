# Testing

## Manual Testing Workflow

After making changes:

1. Rebuild extension: `cd src/ && npx @anthropic-ai/mcpb pack`
2. Install in Claude Desktop: `open ./*.mcpb`
3. Restart Claude Desktop
4. Test each modified tool with real data
5. Check logs for errors

## Tool-Specific Tests

**search_and_read**:
```
Enhanced iMessage Connector:search_and_read with query "Mom" limit 10
```

**read_conversation**:
```
Enhanced iMessage Connector:read_conversation with identifier "Mom" days_back 30
Enhanced iMessage Connector:read_conversation with identifier "group:123" limit 20
```

**get_conversation_stats**:
```
Enhanced iMessage Connector:get_conversation_stats with identifier "+15551234567" days_back 60
```

## Common Test Scenarios

1. **Name-based search**: Use contact name like "Mom" or "John"
2. **Phone number formats**: Test with +1, without +1, with/without formatting
3. **Email addresses**: Test iMessage via email
4. **Group chats**: Use "group:ID" format (get ID from search_and_read results)
5. **Date ranges**: Test with various days_back values (7, 30, 365)
6. **Large result sets**: Test limit parameter behavior
