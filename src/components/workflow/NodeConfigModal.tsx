
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { Save, X } from 'lucide-react';

export interface NodeConfiguration {
  label: string;
  instructions: string;
  aiModel: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  tools: string[];
  parameters: {
    inputs: { name: string; type: string; required: boolean }[];
    outputs: { name: string; type: string }[];
  };
}

interface NodeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: NodeConfiguration) => void;
  initialConfig?: Partial<NodeConfiguration>;
  nodeId: string;
}

const DEFAULT_CONFIG: NodeConfiguration = {
  label: 'Action Node',
  instructions: '',
  aiModel: {
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 512,
  },
  tools: [],
  parameters: {
    inputs: [],
    outputs: [],
  },
};

const AVAILABLE_TOOLS = [
  'web-search',
  'data-analysis',
  'file-processing',
  'api-call',
  'calculation',
];

export const NodeConfigModal: React.FC<NodeConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig = {},
  nodeId,
}) => {
  const form = useForm<NodeConfiguration>({
    defaultValues: { ...DEFAULT_CONFIG, ...initialConfig },
  });

  const [selectedTools, setSelectedTools] = useState<string[]>(
    initialConfig.tools || []
  );

  const handleSave = (data: NodeConfiguration) => {
    onSave({ ...data, tools: selectedTools });
    onClose();
  };

  const toggleTool = (tool: string) => {
    setSelectedTools(prev =>
      prev.includes(tool)
        ? prev.filter(t => t !== tool)
        : [...prev, tool]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Node: {nodeId}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="instructions">Instructions</TabsTrigger>
                <TabsTrigger value="ai-model">AI Model</TabsTrigger>
                <TabsTrigger value="tools">Tools</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Node Label</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter node label" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="instructions" className="space-y-4">
                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instructions for AI</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter detailed instructions for this action..."
                          className="min-h-[200px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="ai-model" className="space-y-4">
                <FormField
                  control={form.control}
                  name="aiModel.model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AI Model</FormLabel>
                      <FormControl>
                        <Input value="deepseek-chat" disabled {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aiModel.temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature (0-1)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aiModel.maxTokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Tokens</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="4096"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="tools" className="space-y-4">
                <div>
                  <FormLabel>Available Tools</FormLabel>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {AVAILABLE_TOOLS.map((tool) => (
                      <Badge
                        key={tool}
                        variant={selectedTools.includes(tool) ? "default" : "outline"}
                        className="cursor-pointer justify-center p-2"
                        onClick={() => toggleTool(tool)}
                      >
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <FormLabel>Selected Tools</FormLabel>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTools.map((tool) => (
                      <Badge key={tool} variant="default" className="flex items-center gap-1">
                        {tool}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => toggleTool(tool)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
