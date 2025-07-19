
import { memo } from 'react';
import { Message } from '@/store/useChatStore';
import { ToolDebugInfo } from '@/components/chat/ToolDebugInfo';

interface MessageListProps {
  messages: Message[];
}

const MessageBubble = memo(({ message }: { message: Message }) => {
  const isUser = message.author === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3`}>
        {typeof message.content === 'string' ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div>
            <p className="whitespace-pre-wrap">{message.content.text}</p>
            {message.content.downloadButton && (
              <div className="mt-2">
                <a
                  href={message.content.downloadButton.url}
                  download={message.content.downloadButton.filename}
                  className="inline-flex items-center px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                >
                  {message.content.downloadButton.label}
                </a>
              </div>
            )}
          </div>
        )}
        
        {!isUser && (
          <ToolDebugInfo 
            currentTool={message.currentTool}
            debugInfo={message.debugInfo}
            toolChain={message.toolChain}
          />
        )}
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

export const MessageList = memo(({ messages }: MessageListProps) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
});

MessageList.displayName = 'MessageList';
