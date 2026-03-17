import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SkillsGapAnalysis } from "@/types/match";
import { CheckCircle, XCircle, Plus, Target, TrendingUp, AlertCircle } from "lucide-react";

interface SkillsComparisonViewProps {
  analysis: SkillsGapAnalysis;
  className?: string;
}

export function SkillsComparisonView({ analysis, className = "" }: SkillsComparisonViewProps) {
  const { skills_gap_analysis, recommendations, match_score } = analysis;

  const getMatchTypeIcon = (matchType: string) => {
    switch (matchType) {
      case 'direct/synonym':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fuzzy':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getMatchTypeLabel = (matchType: string) => {
    switch (matchType) {
      case 'direct/synonym':
        return 'Exact Match';
      case 'fuzzy':
        return 'Similar Match';
      default:
        return 'Match';
    }
  };

  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'direct/synonym':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'fuzzy':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const calculateMatchPercentage = () => {
    const total = skills_gap_analysis.match_counts.required_total + 
                  skills_gap_analysis.match_counts.nice_to_have_total;
    const matched = skills_gap_analysis.match_counts.required_matched + 
                    skills_gap_analysis.match_counts.nice_to_have_matched;
    return total > 0 ? (matched / total) * 100 : 0;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {skills_gap_analysis.match_counts.required_matched}
            </div>
            <div className="text-sm text-muted-foreground">Required Skills Matched</div>
            <div className="text-xs text-muted-foreground mt-1">
              of {skills_gap_analysis.match_counts.required_total} required
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {skills_gap_analysis.match_counts.nice_to_have_matched}
            </div>
            <div className="text-sm text-muted-foreground">Nice-to-Have Matched</div>
            <div className="text-xs text-muted-foreground mt-1">
              of {skills_gap_analysis.match_counts.nice_to_have_total} preferred
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {skills_gap_analysis.match_counts.extra_count}
            </div>
            <div className="text-sm text-muted-foreground">Bonus Skills</div>
            <div className="text-xs text-muted-foreground mt-1">
              additional value
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {match_score.overall.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">Overall Score</div>
            <div className="text-xs text-muted-foreground mt-1">
              out of 100
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Skills Match Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Skills Match</span>
                <span>{calculateMatchPercentage().toFixed(1)}%</span>
              </div>
              <Progress value={calculateMatchPercentage()} className="h-3" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Skills Component Score</span>
                <span>{match_score.skills_component.toFixed(1)}/40</span>
              </div>
              <Progress value={(match_score.skills_component / 40) * 100} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Skills Analysis */}
      <Tabs defaultValue="matched" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="matched">
            Matched ({skills_gap_analysis.matched_skills.length})
          </TabsTrigger>
          <TabsTrigger value="missing">
            Missing ({skills_gap_analysis.missing_required.length})
          </TabsTrigger>
          <TabsTrigger value="nice-to-have">
            Nice-to-Have ({skills_gap_analysis.missing_nice_to_have.length})
          </TabsTrigger>
          <TabsTrigger value="extra">
            Bonus ({skills_gap_analysis.extra_skills.length})
          </TabsTrigger>
        </TabsList>

        {/* Matched Skills */}
        <TabsContent value="matched">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Skills Matched
              </CardTitle>
            </CardHeader>
            <CardContent>
              {skills_gap_analysis.matched_skills.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No skills matched yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {skills_gap_analysis.matched_skills.map((skill, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getMatchTypeIcon(skill.match_type)}
                        <div>
                          <div className="font-medium">{skill.job_skill}</div>
                          {skill.candidate_skill !== skill.job_skill && (
                            <div className="text-sm text-muted-foreground">
                              Candidate has: {skill.candidate_skill}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getMatchTypeColor(skill.match_type)}>
                          {getMatchTypeLabel(skill.match_type)}
                        </Badge>
                        {skill.required && (
                          <Badge variant="secondary">Required</Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {(skill.similarity * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Missing Required Skills */}
        <TabsContent value="missing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Missing Required Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {skills_gap_analysis.missing_required.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-green-600 font-medium">All required skills are matched!</p>
                  <p className="text-muted-foreground">This candidate has all the essential skills.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {skills_gap_analysis.missing_required.map((skill, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/10">
                      <div className="flex items-center gap-3">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="font-medium">{skill}</span>
                      </div>
                      <Badge variant="destructive">Required</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Missing Nice-to-Have Skills */}
        <TabsContent value="nice-to-have">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Missing Nice-to-Have Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {skills_gap_analysis.missing_nice_to_have.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-green-600 font-medium">All preferred skills are matched!</p>
                  <p className="text-muted-foreground">This candidate exceeds expectations.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {skills_gap_analysis.missing_nice_to_have.map((skill, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-yellow-200 rounded-lg bg-yellow-50 dark:bg-yellow-900/10">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{skill}</span>
                      </div>
                      <Badge variant="secondary">Preferred</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Extra Skills */}
        <TabsContent value="extra">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-purple-500" />
                Bonus Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {skills_gap_analysis.extra_skills.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No additional skills beyond job requirements.
                </p>
              ) : (
                <div className="space-y-2">
                  {skills_gap_analysis.extra_skills.map((skill, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-purple-200 rounded-lg bg-purple-50 dark:bg-purple-900/10">
                      <div className="flex items-center gap-3">
                        <Plus className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">{skill}</span>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                        Bonus
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Skills to Develop */}
            <div>
              <h4 className="font-medium text-red-600 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Priority Skills to Develop
              </h4>
              {recommendations.skills_to_develop.length === 0 ? (
                <p className="text-sm text-muted-foreground">None - all required skills matched!</p>
              ) : (
                <div className="space-y-2">
                  {recommendations.skills_to_develop.map((skill, index) => (
                    <Badge key={index} variant="destructive" className="mr-1 mb-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Bonus Skills to Learn */}
            <div>
              <h4 className="font-medium text-yellow-600 mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nice-to-Have Skills
              </h4>
              {recommendations.bonus_skills_to_learn.length === 0 ? (
                <p className="text-sm text-muted-foreground">None - all preferred skills matched!</p>
              ) : (
                <div className="space-y-2">
                  {recommendations.bonus_skills_to_learn.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="mr-1 mb-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Strengths */}
            <div>
              <h4 className="font-medium text-green-600 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Key Strengths
              </h4>
              {recommendations.strengths.length === 0 ? (
                <p className="text-sm text-muted-foreground">No key strengths identified.</p>
              ) : (
                <div className="space-y-2">
                  {recommendations.strengths.map((skill, index) => (
                    <Badge key={index} className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 mr-1 mb-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}