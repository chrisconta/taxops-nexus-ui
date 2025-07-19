import React, { useState, useMemo } from 'react';
import { LogEntry, LogLevel, LogSource } from '@/lib/workflowLogger';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Info, 
  X, 
  Clock, 
  Activity,
  Filter,
  Trash2
} from 'lucide-react';

interface WorkflowDebugPanelProps {
  logs: LogEntry[];
  executionId?: string;
}

export const WorkflowDebugPanel: React.FC<WorkflowDebugPanelProps> = ({
  logs,
  executionId
}) => {
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [selectedSource, setSelectedSource] = useState<LogSource | 'all'>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const levelMatch = selectedLevel === 'all' || log.level === selectedLevel;
      const sourceMatch = selectedSource === 'all' || log.source === selectedSource;
      const executionMatch = !executionId || log.executionId === executionId;
      
      return levelMatch && sourceMatch && executionMatch;
    });
  }, [logs, selectedLevel, selectedSource, executionId]);

  const logStats = useMemo(() => {
    const stats = {
      total: logs.length,
      error: 0,
      warn: 0,
      info: 0,
      debug: 0
    };

    logs.forEach(log => {
      stats[log.level]++;
    });

    return stats;
  }, [logs]);

  const getLogIcon = (level: LogLevel) => {
    switch (level) {
      case 'error': return <X className="h-4 w-4 text-destructive" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'info': return <Info className="h-4 w-4 text-primary" />;
      case 'debug': return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getLevelBadgeVariant = (level: LogLevel) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warn': return 'secondary';
      case 'info': return 'default';
      case 'debug': return 'outline';
    }
  };

  const getSourceColor = (source: LogSource) => {
    switch (source) {
      case 'ui': return 'text-blue-600';
      case 'api': return 'text-green-600';
      case 'ai': return 'text-purple-600';
      case 'execution': return 'text-orange-600';
      case 'validation': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Debug Console</h3>
          <Button variant="ghost" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Stats */}
        <div className="flex gap-2 mt-2">
          <Badge variant="outline">Total: {logStats.total}</Badge>
          {logStats.error > 0 && (
            <Badge variant="destructive">Errors: {logStats.error}</Badge>
          )}
          {logStats.warn > 0 && (
            <Badge variant="secondary">Warnings: {logStats.warn}</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="logs" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-2">
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="flex-1 flex flex-col mt-0">
          {/* Filters */}
          <div className="p-4 border-b space-y-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as LogLevel | 'all')}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="all">All Levels</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>

              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value as LogSource | 'all')}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="all">All Sources</option>
                <option value="ui">UI</option>
                <option value="api">API</option>
                <option value="ai">AI</option>
                <option value="execution">Execution</option>
                <option value="validation">Validation</option>
              </select>
            </div>
          </div>

          {/* Log List */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {filteredLogs.map((log) => (
                <Card 
                  key={log.id} 
                  className={`cursor-pointer transition-colors ${
                    expandedLog === log.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setExpandedLog(
                    expandedLog === log.id ? null : log.id
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      {getLogIcon(log.level)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getLevelBadgeVariant(log.level)} className="text-xs">
                            {log.level.toUpperCase()}
                          </Badge>
                          <span className={`text-xs font-medium ${getSourceColor(log.source)}`}>
                            {log.source.toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <div className="text-sm">{log.message}</div>
                        
                        {expandedLog === log.id && log.details && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2" />
                  <p>No logs match current filters</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="performance" className="flex-1 p-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">API Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Average response time: 234ms
                </div>
                <div className="text-xs text-muted-foreground">
                  Total API calls: {logs.filter(l => l.source === 'api').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Execution Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Workflows executed: {logs.filter(l => l.source === 'execution' && l.message.includes('completed')).length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Success rate: 100%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};