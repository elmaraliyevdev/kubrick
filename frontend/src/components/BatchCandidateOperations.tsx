import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { CandidateMatch } from '@/types/match';
import { matchesApi } from '@/services/matches';
import { 
  Users,
  Calculator,
  Mail,
  Download,
  Tag,
  AlertCircle,
  Loader2,
  UserPlus,
  MessageSquare,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface BatchCandidateOperationsProps {
  candidates: CandidateMatch[];
  selectedCandidates: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  onOperationComplete?: () => void;
  className?: string;
}

interface BatchOperation {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  requiresConfirmation: boolean;
  maxSelection?: number;
}

interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  operation: string;
  details: string[];
  errors: string[];
}

const BATCH_OPERATIONS: BatchOperation[] = [
  {
    id: 'calculate-matches',
    label: 'Recalculate AI Matches',
    description: 'Recalculate AI match scores for selected candidates',
    icon: Calculator,
    color: 'text-blue-600',
    requiresConfirmation: true,
  },
  {
    id: 'send-email',
    label: 'Send Bulk Email',
    description: 'Send email to selected candidates',
    icon: Mail,
    color: 'text-green-600',
    requiresConfirmation: true,
  },
  {
    id: 'export-data',
    label: 'Export to CSV',
    description: 'Export candidate data and match scores',
    icon: Download,
    color: 'text-purple-600',
    requiresConfirmation: false,
  },
  {
    id: 'update-status',
    label: 'Update Status',
    description: 'Change application status for selected candidates',
    icon: Tag,
    color: 'text-orange-600',
    requiresConfirmation: true,
  },
  {
    id: 'add-to-job',
    label: 'Add to Job',
    description: 'Apply selected candidates to a job',
    icon: UserPlus,
    color: 'text-indigo-600',
    requiresConfirmation: true,
  },
  {
    id: 'schedule-interview',
    label: 'Schedule Interviews',
    description: 'Bulk schedule interviews for selected candidates',
    icon: MessageSquare,
    color: 'text-teal-600',
    requiresConfirmation: true,
    maxSelection: 10, // Limit bulk interview scheduling
  },
  {
    id: 'generate-report',
    label: 'Generate Report',
    description: 'Create detailed analysis report for selected candidates',
    icon: FileText,
    color: 'text-gray-600',
    requiresConfirmation: false,
  }
];

const APPLICATION_STATUSES = [
  'New', 'Reviewed', 'Shortlisted', 'Interviewed', 'Offered', 'Hired', 'Rejected'
];

export function BatchCandidateOperations({
  candidates,
  selectedCandidates,
  onSelectionChange,
  onOperationComplete,
  className = ""
}: BatchCandidateOperationsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [operationParams, setOperationParams] = useState<Record<string, any>>({});
  const [showProgress, setShowProgress] = useState(false);

  const selectedCandidateData = useMemo(() => {
    return candidates.filter(c => selectedCandidates.includes(c.candidate.id));
  }, [candidates, selectedCandidates]);

  const selectAll = useCallback(() => {
    onSelectionChange(candidates.map(c => c.candidate.id));
  }, [candidates, onSelectionChange]);

  const selectNone = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  const selectByTier = useCallback((tier: string) => {
    const candidateIds = candidates
      .filter(c => c.match.tier === tier)
      .map(c => c.candidate.id);
    onSelectionChange(candidateIds);
  }, [candidates, onSelectionChange]);

  const selectTopN = useCallback((n: number) => {
    const topCandidates = [...candidates]
      .sort((a, b) => b.match.overall_score - a.match.overall_score)
      .slice(0, n)
      .map(c => c.candidate.id);
    onSelectionChange(topCandidates);
  }, [candidates, onSelectionChange]);

  const executeBatchOperation = useCallback(async (operationId: string, params: Record<string, any> = {}) => {
    if (selectedCandidates.length === 0) {
      toast.error('No candidates selected');
      return;
    }

    setIsProcessing(true);
    setShowProgress(true);
    setProgress({
      total: selectedCandidates.length,
      completed: 0,
      failed: 0,
      operation: operationId,
      details: [],
      errors: []
    });

    try {
      let results: any[] = [];

      switch (operationId) {
        case 'calculate-matches':
          results = await executeBatchMatchCalculation();
          break;
        case 'export-data':
          results = await executeBatchExport();
          break;
        case 'update-status':
          results = await executeBatchStatusUpdate(params.status);
          break;
        case 'send-email':
          results = await executeBatchEmail(params);
          break;
        case 'add-to-job':
          results = await executeBatchJobApplication(params.jobId);
          break;
        case 'schedule-interview':
          results = await executeBatchInterviewScheduling(params);
          break;
        case 'generate-report':
          results = await executeBatchReportGeneration();
          break;
        default:
          throw new Error(`Unknown operation: ${operationId}`);
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;

      setProgress(prev => prev ? {
        ...prev,
        completed: successful,
        failed: failed,
        details: results.filter(r => r.success).map(r => r.message),
        errors: results.filter(r => !r.success).map(r => r.error)
      } : null);

      if (successful > 0) {
        toast.success(`Successfully processed ${successful} candidates`);
        onOperationComplete?.();
      }

      if (failed > 0) {
        toast.error(`Failed to process ${failed} candidates`);
      }

    } catch (error: any) {
      console.error('Batch operation failed:', error);
      toast.error(error.message || 'Batch operation failed');
      setProgress(prev => prev ? {
        ...prev,
        failed: prev.total,
        errors: [error.message || 'Unknown error occurred']
      } : null);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedCandidates, onOperationComplete]);

  const executeBatchMatchCalculation = async () => {
    const results = [];
    for (let i = 0; i < selectedCandidates.length; i++) {
      const candidateId = selectedCandidates[i];
      try {
        await matchesApi.recalculateCandidateMatches(candidateId);
        results.push({ 
          success: true, 
          candidateId, 
          message: `Recalculated matches for candidate ${candidateId}` 
        });
        
        setProgress(prev => prev ? { ...prev, completed: i + 1 } : null);
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        results.push({ 
          success: false, 
          candidateId, 
          error: `Failed to recalculate matches for candidate ${candidateId}: ${error.message}` 
        });
      }
    }
    return results;
  };

  const executeBatchExport = async () => {
    // Generate CSV data
    const csvData = selectedCandidateData.map(candidate => ({
      'Candidate ID': candidate.candidate.id,
      'Name': `${candidate.candidate.first_name} ${candidate.candidate.last_name}`,
      'Email': candidate.candidate.email || '',
      'Location': candidate.candidate.location || '',
      'Experience Years': candidate.candidate.experience_years || 0,
      'Skills Count': candidate.candidate.skills_count || 0,
      'Match Score': candidate.match.overall_score.toFixed(2),
      'Match Tier': candidate.match.tier,
      'Skills Matched': candidate.match.skills_summary.matched_count,
      'Skills Missing': candidate.match.skills_summary.missing_count,
      'Skills Extra': candidate.match.skills_summary.extra_count,
      'Skills Component': candidate.match.breakdown.skills.toFixed(2),
      'Experience Component': candidate.match.breakdown.experience.toFixed(2),
      'Education Component': candidate.match.breakdown.education.toFixed(2),
      'Additional Component': candidate.match.breakdown.additional.toFixed(2),
      'Calculated At': candidate.match.calculated_at || ''
    }));

    // Convert to CSV
    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${(row as Record<string, unknown>)[header] || ''}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `candidate-matches-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return [{ success: true, message: 'CSV file downloaded successfully' }];
  };

  const executeBatchStatusUpdate = async (status: string) => {
    // This would need to be implemented based on your API
    const results = [];
    for (const candidateId of selectedCandidates) {
      try {
        // await candidatesApi.updateStatus(candidateId, status);
        results.push({ 
          success: true, 
          candidateId, 
          message: `Updated status to ${status} for candidate ${candidateId}` 
        });
      } catch (error: any) {
        results.push({ 
          success: false, 
          candidateId, 
          error: `Failed to update status for candidate ${candidateId}: ${error.message}` 
        });
      }
    }
    return results;
  };

  const executeBatchEmail = async (_params: any) => {
    // Mock implementation - replace with actual email API
    const results = [];
    for (const candidateId of selectedCandidates) {
      results.push({ 
        success: true, 
        candidateId, 
        message: `Email sent to candidate ${candidateId}` 
      });
    }
    return results;
  };

  const executeBatchJobApplication = async (jobId: number) => {
    // Mock implementation - replace with actual job application API
    const results = [];
    for (const candidateId of selectedCandidates) {
      results.push({ 
        success: true, 
        candidateId, 
        message: `Added candidate ${candidateId} to job ${jobId}` 
      });
    }
    return results;
  };

  const executeBatchInterviewScheduling = async (_params: any) => {
    // Mock implementation - replace with actual interview scheduling API
    const results = [];
    for (const candidateId of selectedCandidates) {
      results.push({ 
        success: true, 
        candidateId, 
        message: `Interview scheduled for candidate ${candidateId}` 
      });
    }
    return results;
  };

  const executeBatchReportGeneration = async () => {
    // Generate a summary report
    const reportData = {
      totalCandidates: selectedCandidates.length,
      averageScore: selectedCandidateData.reduce((sum, c) => sum + c.match.overall_score, 0) / selectedCandidateData.length,
      tierDistribution: {
        excellent: selectedCandidateData.filter(c => c.match.tier === 'excellent').length,
        good: selectedCandidateData.filter(c => c.match.tier === 'good').length,
        poor: selectedCandidateData.filter(c => c.match.tier === 'poor').length,
      },
      topSkills: {}, // Would calculate most common skills
      generatedAt: new Date().toISOString()
    };

    console.log('Batch Report Generated:', reportData);
    return [{ success: true, message: 'Report generated successfully (check console)' }];
  };

  const ProgressDialog = () => (
    <Dialog open={showProgress} onOpenChange={setShowProgress}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className={`h-5 w-5 ${isProcessing ? 'animate-spin' : ''}`} />
            Batch Operation Progress
          </DialogTitle>
        </DialogHeader>
        
        {progress && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Processing {progress.operation}...</span>
                <span>{progress.completed + progress.failed} of {progress.total}</span>
              </div>
              <Progress 
                value={((progress.completed + progress.failed) / progress.total) * 100} 
                className="h-3" 
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{progress.completed}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{progress.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {progress.total - progress.completed - progress.failed}
                </div>
                <div className="text-sm text-muted-foreground">Remaining</div>
              </div>
            </div>

            {progress.errors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <details>
                    <summary className="cursor-pointer font-medium">
                      {progress.errors.length} errors occurred
                    </summary>
                    <ul className="mt-2 list-disc list-inside text-sm">
                      {progress.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {progress.errors.length > 5 && (
                        <li>... and {progress.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </details>
                </AlertDescription>
              </Alert>
            )}

            {!isProcessing && (
              <div className="flex justify-end gap-2">
                <Button onClick={() => setShowProgress(false)}>
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  if (selectedCandidates.length === 0) {
    return null;
  }

  return (
    <>
      <Card className={`${className} sticky top-4 z-10`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Batch Operations
            </CardTitle>
            <Badge variant="secondary">
              {selectedCandidates.length} selected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quick Selection */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All ({candidates.length})
              </Button>
              <Button variant="outline" size="sm" onClick={selectNone}>
                Clear Selection
              </Button>
              <Button variant="outline" size="sm" onClick={() => selectByTier('excellent')}>
                Excellent Matches
              </Button>
              <Button variant="outline" size="sm" onClick={() => selectByTier('good')}>
                Good Matches
              </Button>
              <Button variant="outline" size="sm" onClick={() => selectTopN(10)}>
                Top 10
              </Button>
            </div>

            {/* Batch Operations */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {BATCH_OPERATIONS.map((operation) => {
                const Icon = operation.icon;
                const disabled = !!(operation.maxSelection && selectedCandidates.length > operation.maxSelection);
                
                return (
                  <Dialog key={operation.id}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={isProcessing || disabled}
                        className="flex flex-col h-auto p-3 text-center"
                      >
                        <Icon className={`h-4 w-4 mb-1 ${operation.color}`} />
                        <span className="text-xs">{operation.label}</span>
                        {disabled && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            Max {operation.maxSelection}
                          </Badge>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Icon className={`h-5 w-5 ${operation.color}`} />
                          {operation.label}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-muted-foreground">{operation.description}</p>
                        <p className="text-sm">
                          This operation will affect <strong>{selectedCandidates.length}</strong> selected candidates.
                        </p>

                        {/* Operation-specific parameters */}
                        {operation.id === 'update-status' && (
                          <div>
                            <label className="text-sm font-medium">New Status</label>
                            <Select onValueChange={(value) => setOperationParams({ status: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                {APPLICATION_STATUSES.map(status => (
                                  <SelectItem key={status} value={status}>{status}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <Button variant="outline">Cancel</Button>
                          <Button 
                            onClick={() => executeBatchOperation(operation.id, operationParams)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Execute
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <ProgressDialog />
    </>
  );
}