import { useState, useCallback, useEffect } from 'react';
import { WorkflowLogger, LogEntry } from '@/lib/workflowLogger';
import { supabase } from '@/integrations/supabase/client';

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface WorkflowConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowState {
  id?: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  status: 'draft' | 'active' | 'archived';
  currentExecutionId?: string;
  metadata: Record<string, any>;
}

export const useWorkflowBuilder = () => {
  const logger = WorkflowLogger.getInstance();
  
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    name: 'New Workflow',
    description: '',
    nodes: [],
    connections: [],
    status: 'draft',
    metadata: {}
  });

  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Subscribe to logger updates
  useEffect(() => {
    const unsubscribe = logger.subscribe((entry) => {
      setLogs(prev => [entry, ...prev].slice(0, 100)); // Keep last 100 logs
    });

    return unsubscribe;
  }, [logger]);

  const updateWorkflow = useCallback((updates: Partial<WorkflowState>) => {
    logger.debug('ui', 'Workflow state updated', { updates });
    
    setWorkflowState(prev => ({
      ...prev,
      ...updates
    }));
  }, [logger]);

  const addNode = useCallback((node: Omit<WorkflowNode, 'id'>) => {
    const newNode: WorkflowNode = {
      ...node,
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    logger.info('ui', 'Node added to workflow', { 
      nodeType: newNode.type, 
      nodeId: newNode.id 
    });

    updateWorkflow({
      nodes: [...workflowState.nodes, newNode]
    });

    return newNode.id;
  }, [workflowState.nodes, updateWorkflow, logger]);

  const removeNode = useCallback((nodeId: string) => {
    logger.info('ui', 'Node removed from workflow', { nodeId });

    updateWorkflow({
      nodes: workflowState.nodes.filter(node => node.id !== nodeId),
      connections: workflowState.connections.filter(
        conn => conn.sourceId !== nodeId && conn.targetId !== nodeId
      )
    });
  }, [workflowState.nodes, workflowState.connections, updateWorkflow, logger]);

  const addConnection = useCallback((connection: Omit<WorkflowConnection, 'id'>) => {
    const newConnection: WorkflowConnection = {
      ...connection,
      id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    logger.info('ui', 'Connection added to workflow', { 
      connectionId: newConnection.id,
      source: newConnection.sourceId,
      target: newConnection.targetId
    });

    updateWorkflow({
      connections: [...workflowState.connections, newConnection]
    });

    return newConnection.id;
  }, [workflowState.connections, updateWorkflow, logger]);

  const saveWorkflow = useCallback(async () => {
    const startTime = Date.now();
    logger.info('api', 'Saving workflow to database', { workflowId: workflowState.id });

    try {
      const workflow = {
        name: workflowState.name,
        description: workflowState.description,
        nodes: workflowState.nodes as any,
        connections: workflowState.connections as any,
        metadata: workflowState.metadata as any,
        status: workflowState.status
      };

      let data, error;
      
      if (workflowState.id) {
        const result = await supabase
          .from('tool_workflows')
          .update(workflow)
          .eq('id', workflowState.id)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase
          .from('tool_workflows')
          .insert(workflow)
          .select()
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      logger.logApiCall('api', '/tool_workflows', 'POST', startTime, data);
      
      updateWorkflow({ id: data.id });
      return data;
    } catch (error) {
      logger.logApiCall('api', '/tool_workflows', 'POST', startTime, undefined, error);
      throw error;
    }
  }, [workflowState, updateWorkflow, logger]);

  const executeWorkflow = useCallback(async () => {
    if (!workflowState.id) {
      logger.error('execution', 'Cannot execute workflow without saving first');
      return;
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    logger.info('execution', 'Workflow execution started', { 
      executionId,
      nodeCount: workflowState.nodes.length 
    });

    setIsExecuting(true);
    updateWorkflow({ currentExecutionId: executionId });

    try {
      // Create execution record - user_id will be handled by RLS
      const { data: execution, error: execError } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_id: workflowState.id,
          status: 'running'
        })
        .select()
        .single();

      if (execError) throw execError;

      logger.info('execution', 'Execution record created', { 
        executionId: execution.id 
      }, execution.id);

      // Simulate workflow execution (replace with actual execution logic)
      for (let i = 0; i < workflowState.nodes.length; i++) {
        const node = workflowState.nodes[i];
        
        logger.info('execution', `Executing node: ${node.type}`, { 
          nodeId: node.id,
          step: i + 1,
          totalSteps: workflowState.nodes.length 
        }, execution.id, i);

        // Simulate node processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Update execution as completed
      await supabase
        .from('workflow_executions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', execution.id);

      const duration = Date.now() - startTime;
      logger.info('execution', 'Workflow execution completed', { 
        executionId: execution.id,
        duration 
      }, execution.id);

    } catch (error) {
      logger.error('execution', 'Workflow execution failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        executionId 
      }, executionId);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, [workflowState, updateWorkflow, logger]);

  const validateWorkflow = useCallback(() => {
    logger.info('validation', 'Validating workflow structure');
    
    const errors: string[] = [];

    // Check for isolated nodes
    const connectedNodeIds = new Set([
      ...workflowState.connections.map(c => c.sourceId),
      ...workflowState.connections.map(c => c.targetId)
    ]);

    const isolatedNodes = workflowState.nodes.filter(
      node => !connectedNodeIds.has(node.id) && workflowState.nodes.length > 1
    );

    if (isolatedNodes.length > 0) {
      errors.push(`Found ${isolatedNodes.length} isolated nodes`);
      logger.warn('validation', 'Isolated nodes detected', { 
        isolatedNodeIds: isolatedNodes.map(n => n.id) 
      });
    }

    // Check for circular dependencies (simplified)
    const hasCircularDependency = workflowState.connections.some(conn => 
      workflowState.connections.some(other => 
        other.sourceId === conn.targetId && other.targetId === conn.sourceId
      )
    );

    if (hasCircularDependency) {
      errors.push('Circular dependency detected');
      logger.warn('validation', 'Circular dependency detected');
    }

    if (errors.length === 0) {
      logger.info('validation', 'Workflow validation passed');
    }

    return { isValid: errors.length === 0, errors };
  }, [workflowState, logger]);

  return {
    workflowState,
    updateWorkflow,
    addNode,
    removeNode,
    addConnection,
    saveWorkflow,
    executeWorkflow,
    validateWorkflow,
    isExecuting,
    logs
  };
};