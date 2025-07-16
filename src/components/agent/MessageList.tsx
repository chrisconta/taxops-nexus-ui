import React from "react";
import { Message } from "@/store/useChatStore";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  className?: string;
}

const TypingDots = () => (
  <div className="flex space-x-1">
    <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
    <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
    <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
  </div>
);

const FileLink = ({ url, filename }: { url: string; filename: string }) => (
  <Badge 
    variant="secondary" 
    className="bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer inline-flex items-center gap-1 mt-2" 
    onClick={() => window.open(url, '_blank')}
  >
    <Download className="w-3 h-3" />
    {filename}
  </Badge>
);

const DownloadButton = ({ label, url, filename }: { label: string; url: string; filename: string }) => (
  <div className="mt-4 mb-2">
    <p className="text-sm text-white/70 mb-3">Here is the report to download:</p>
    <button 
      onClick={() => window.open(url, '_blank')} 
      className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
    >
      <Download className="w-5 h-5" />
      {label}
    </button>
  </div>
);

const MessageContent = ({ content }: { content: string | { text: string; downloadButton?: { label: string; url: string; filename: string } } }) => {
  // Handle structured content with download button
  if (typeof content === 'object' && content.downloadButton) {
    return (
      <div className="whitespace-pre-wrap">
        <span>{content.text}</span>
        <DownloadButton 
          label={content.downloadButton.label} 
          url={content.downloadButton.url} 
          filename={content.downloadButton.filename} 
        />
      </div>
    );
  }

  // Handle string content (backward compatibility)
  const stringContent = typeof content === 'string' ? content : content.text;

  // Detect file links
  const parts = stringContent.split(/(\[Download report\]\([^)]+\))/g);
  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        const linkMatch = part.match(/\[Download report\]\(([^)]+)\)/);
        if (linkMatch) {
          const url = linkMatch[1];
          const filename = url.split('/').pop() || 'report.csv';
          return <FileLink key={index} url={url} filename={filename} />;
        }
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
};

export const MessageList: React.FC<MessageListProps> = ({ messages, className = "" }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {messages.map(message => (
        <div key={message.id} className={`flex ${message.author === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-full ${message.author === 'user' ? 'max-w-xs lg:max-w-md' : 'max-w-4xl'}`}>
            <div className={`px-4 py-2 rounded-2xl ${
              message.author === 'user' 
                ? 'bg-primary text-white' 
                : 'bg-glass-bg/30 border border-glass-border text-white'
            }`}>
              {message.typing ? <TypingDots /> : <MessageContent content={message.content} />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};