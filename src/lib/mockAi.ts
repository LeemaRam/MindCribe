import { AnalysisResult } from '../types';

export const mockAnalyzeTranscript = async (transcript: string): Promise<AnalysisResult> => {
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  return {
    title: "Project Phoenix Strategy Sync",
    summary: "The team discussed the upcoming Q3 product launch and resolved the critical bottleneck in the cloud infrastructure. Key stakeholders agreed on the revised timeline and budget allocations for the marketing campaign.",
    keyPoints: [
      "Cloud infrastructure scaling resolved through serverless migration.",
      "Q3 launch date confirmed for September 15th.",
      "Marketing budget increased by 15% to support global expansion.",
      "Internal testing phase begins next Monday."
    ],
    actionItems: [
      { task: "Initiate serverless migration", owner: "Engineering Team", priority: "High" },
      { task: "Finalize marketing assets", owner: "Sarah Wilson", priority: "Medium" },
      { task: "Update stakeholder roadmaps", owner: "Project Lead", priority: "Low" }
    ],
    meeting_score: {
      clarity: 9,
      productivity: 8,
      engagement: 7
    },
    suggestions: [
      "Include a technical deep-dive in the next session.",
      "Limit the agenda to 3 core topics for better focus.",
      "Rotate meeting leads to increase team engagement."
    ]
  };
};

export const mockChat = async (question: string, context: string): Promise<string> => {
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const responses = [
    "Based on the transcript, the primary concern was scalability. The team agreed that serverless was the most efficient route forward.",
    "The budget increase was specifically for global expansion efforts, which the transcript indicates will focus first on EMEA and APAC regions.",
    "According to the discussion, the deadline for marketing assets is firm because of the planned press release on September 20th.",
    "The analysis suggests that engagement was high during the infrastructure debate, but dipped slightly when discussing budget details."
  ];

  return responses[Math.floor(Math.random() * responses.length)];
};
