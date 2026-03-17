import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Filter,
  X,
  Search,
  Briefcase,
  GraduationCap,
  Calendar,
  Users,
  Target,
  Settings2
} from 'lucide-react';

export interface AdvancedFilters {
  // Basic filters
  searchTerm?: string;
  location?: string;
  minExperience?: number;
  maxExperience?: number;
  
  // Match-related filters
  minScore?: number;
  maxScore?: number;
  tiers?: string[];
  
  // Skills filters
  requiredSkills?: string[];
  preferredSkills?: string[];
  missingSkills?: string[];
  
  // Education filters
  educationLevels?: string[];
  fieldOfStudy?: string[];
  
  // Employment filters
  employmentTypes?: string[];
  workArrangements?: string[];
  salaryRange?: [number, number];
  
  // Availability filters
  availabilityStatus?: string[];
  noticePeriod?: number;
  
  // Application status
  applicationStatuses?: string[];
  
  // Date filters
  appliedAfter?: string;
  appliedBefore?: string;
  lastUpdatedAfter?: string;
}

interface AdvancedCandidateFiltersProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  availableSkills?: string[];
  className?: string;
}

const EDUCATION_LEVELS = [
  'High School',
  'Associate Degree',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'PhD',
  'Professional Degree',
  'Certification'
];

const EMPLOYMENT_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Freelance',
  'Internship',
  'Temporary'
];

const WORK_ARRANGEMENTS = [
  'On-site',
  'Remote',
  'Hybrid',
  'Flexible'
];

const APPLICATION_STATUSES = [
  'New',
  'Reviewed',
  'Shortlisted',
  'Interviewed',
  'Offered',
  'Hired',
  'Rejected'
];

const MATCH_TIERS = [
  { value: 'excellent', label: 'Excellent Match (80-100)' },
  { value: 'good', label: 'Good Match (60-79)' },
  { value: 'poor', label: 'Poor Match (0-59)' },
  { value: 'unscored', label: 'Unscored' }
];

export function AdvancedCandidateFilters({ 
  filters, 
  onFiltersChange, 
  availableSkills: _availableSkills = [],
  className = "" 
}: AdvancedCandidateFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  const updateFilters = useCallback((updates: Partial<AdvancedFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  }, [filters, onFiltersChange]);

  const clearFilters = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  const addSkill = useCallback((skillType: 'requiredSkills' | 'preferredSkills' | 'missingSkills', skill: string) => {
    if (!skill.trim()) return;
    
    const currentSkills = filters[skillType] || [];
    if (!currentSkills.includes(skill)) {
      updateFilters({
        [skillType]: [...currentSkills, skill]
      });
    }
    setSkillInput('');
  }, [filters, updateFilters]);

  const removeSkill = useCallback((skillType: 'requiredSkills' | 'preferredSkills' | 'missingSkills', skill: string) => {
    const currentSkills = filters[skillType] || [];
    updateFilters({
      [skillType]: currentSkills.filter(s => s !== skill)
    });
  }, [filters, updateFilters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.location) count++;
    if (filters.minExperience !== undefined) count++;
    if (filters.maxExperience !== undefined) count++;
    if (filters.minScore !== undefined) count++;
    if (filters.maxScore !== undefined) count++;
    if (filters.tiers?.length) count++;
    if (filters.requiredSkills?.length) count++;
    if (filters.preferredSkills?.length) count++;
    if (filters.missingSkills?.length) count++;
    if (filters.educationLevels?.length) count++;
    if (filters.fieldOfStudy?.length) count++;
    if (filters.employmentTypes?.length) count++;
    if (filters.workArrangements?.length) count++;
    if (filters.salaryRange) count++;
    if (filters.availabilityStatus?.length) count++;
    if (filters.applicationStatuses?.length) count++;
    if (filters.appliedAfter || filters.appliedBefore) count++;
    if (filters.lastUpdatedAfter) count++;
    
    return count;
  }, [filters]);

  const SkillInput = ({ 
    skillType, 
    label, 
    placeholder 
  }: { 
    skillType: 'requiredSkills' | 'preferredSkills' | 'missingSkills';
    label: string;
    placeholder: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addSkill(skillType, skillInput);
            }
          }}
        />
        <Button 
          size="sm" 
          onClick={() => addSkill(skillType, skillInput)}
          disabled={!skillInput.trim()}
        >
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {(filters[skillType] || []).map((skill) => (
          <Badge key={skill} variant="secondary" className="text-xs">
            {skill}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 ml-1 hover:bg-transparent"
              onClick={() => removeSkill(skillType, skill)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Basic Search */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Search className="h-4 w-4" />
          Basic Search
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Search Candidates</Label>
            <Input
              placeholder="Name, email, skills..."
              value={filters.searchTerm || ''}
              onChange={(e) => updateFilters({ searchTerm: e.target.value })}
            />
          </div>
          <div>
            <Label>Location</Label>
            <Input
              placeholder="City, state, country..."
              value={filters.location || ''}
              onChange={(e) => updateFilters({ location: e.target.value })}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Experience Range */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Experience Level
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Minimum Years</Label>
            <Input
              type="number"
              placeholder="0"
              value={filters.minExperience || ''}
              onChange={(e) => updateFilters({ minExperience: e.target.value ? parseInt(e.target.value) : undefined })}
            />
          </div>
          <div>
            <Label>Maximum Years</Label>
            <Input
              type="number"
              placeholder="20"
              value={filters.maxExperience || ''}
              onChange={(e) => updateFilters({ maxExperience: e.target.value ? parseInt(e.target.value) : undefined })}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Match Score Range */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Target className="h-4 w-4" />
          AI Match Score
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Minimum Score</Label>
            <Slider
              value={[filters.minScore || 0]}
              onValueChange={(value: number[]) => updateFilters({ minScore: value[0] })}
              max={100}
              step={5}
              className="mt-2"
            />
            <div className="text-sm text-muted-foreground mt-1">
              {filters.minScore || 0}%
            </div>
          </div>
          <div>
            <Label>Maximum Score</Label>
            <Slider
              value={[filters.maxScore || 100]}
              onValueChange={(value: number[]) => updateFilters({ maxScore: value[0] })}
              max={100}
              step={5}
              className="mt-2"
            />
            <div className="text-sm text-muted-foreground mt-1">
              {filters.maxScore || 100}%
            </div>
          </div>
        </div>

        <div>
          <Label>Match Tiers</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {MATCH_TIERS.map((tier) => (
              <div key={tier.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`tier-${tier.value}`}
                  checked={(filters.tiers || []).includes(tier.value)}
                  onCheckedChange={(checked) => {
                    const currentTiers = filters.tiers || [];
                    updateFilters({
                      tiers: checked 
                        ? [...currentTiers, tier.value]
                        : currentTiers.filter(t => t !== tier.value)
                    });
                  }}
                />
                <Label htmlFor={`tier-${tier.value}`} className="text-sm">
                  {tier.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* Skills Filters */}
      <div className="space-y-4">
        <h3 className="font-semibold">Skills Analysis</h3>
        
        <SkillInput
          skillType="requiredSkills"
          label="Must Have Skills"
          placeholder="Enter required skill..."
        />
        
        <SkillInput
          skillType="preferredSkills"
          label="Preferred Skills"
          placeholder="Enter preferred skill..."
        />
        
        <SkillInput
          skillType="missingSkills"
          label="Should NOT Have"
          placeholder="Enter skill to exclude..."
        />
      </div>

      <Separator />

      {/* Education */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          Education
        </h3>
        
        <div>
          <Label>Education Levels</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {EDUCATION_LEVELS.map((level) => (
              <div key={level} className="flex items-center space-x-2">
                <Checkbox
                  id={`edu-${level}`}
                  checked={(filters.educationLevels || []).includes(level)}
                  onCheckedChange={(checked) => {
                    const current = filters.educationLevels || [];
                    updateFilters({
                      educationLevels: checked 
                        ? [...current, level]
                        : current.filter(l => l !== level)
                    });
                  }}
                />
                <Label htmlFor={`edu-${level}`} className="text-sm">
                  {level}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* Employment Preferences */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" />
          Employment
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Employment Types</Label>
            <div className="space-y-2 mt-2">
              {EMPLOYMENT_TYPES.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`emp-${type}`}
                    checked={(filters.employmentTypes || []).includes(type)}
                    onCheckedChange={(checked) => {
                      const current = filters.employmentTypes || [];
                      updateFilters({
                        employmentTypes: checked 
                          ? [...current, type]
                          : current.filter(t => t !== type)
                      });
                    }}
                  />
                  <Label htmlFor={`emp-${type}`} className="text-sm">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <Label>Work Arrangements</Label>
            <div className="space-y-2 mt-2">
              {WORK_ARRANGEMENTS.map((arrangement) => (
                <div key={arrangement} className="flex items-center space-x-2">
                  <Checkbox
                    id={`work-${arrangement}`}
                    checked={(filters.workArrangements || []).includes(arrangement)}
                    onCheckedChange={(checked) => {
                      const current = filters.workArrangements || [];
                      updateFilters({
                        workArrangements: checked 
                          ? [...current, arrangement]
                          : current.filter(a => a !== arrangement)
                      });
                    }}
                  />
                  <Label htmlFor={`work-${arrangement}`} className="text-sm">
                    {arrangement}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Application Status */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Application Status
        </h3>
        
        <div>
          <Label>Status</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {APPLICATION_STATUSES.map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status}`}
                  checked={(filters.applicationStatuses || []).includes(status)}
                  onCheckedChange={(checked) => {
                    const current = filters.applicationStatuses || [];
                    updateFilters({
                      applicationStatuses: checked 
                        ? [...current, status]
                        : current.filter(s => s !== status)
                    });
                  }}
                />
                <Label htmlFor={`status-${status}`} className="text-sm">
                  {status}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clear Filters */}
      <div className="pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={clearFilters}
          className="w-full"
          disabled={activeFiltersCount === 0}
        >
          Clear All Filters ({activeFiltersCount})
        </Button>
      </div>
    </div>
  );

  return (
    <div className={className}>
      {/* Desktop Popover */}
      <div className="hidden md:block">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Settings2 className="h-4 w-4 mr-2" />
              Advanced Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[800px] max-h-[600px] overflow-y-auto" 
            align="start"
          >
            <FilterContent />
          </PopoverContent>
        </Popover>
      </div>

      {/* Mobile Sheet */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:w-[400px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Advanced Filters</SheetTitle>
              <SheetDescription>
                Filter candidates by various criteria to find the best matches.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}