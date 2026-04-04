import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Sparkles, Heart, Brain, Activity, Moon, Smile, Leaf, Dumbbell } from "lucide-react";

export default function WellnessTips() {
  const personalizedTips = [
    {
      category: "Stress Management",
      icon: Brain,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      tips: [
        {
          title: "Daily Meditation Practice",
          description: "Your blood pressure readings show slight elevation during stress. Try 10-15 minutes of guided meditation daily to help lower stress hormones.",
          importance: "high",
          reason: "Recommended for: Blood pressure management",
        },
        {
          title: "Deep Breathing Exercises",
          description: "Practice 4-7-8 breathing technique: Inhale for 4 counts, hold for 7, exhale for 8. Repeat 3-4 times when feeling stressed.",
          importance: "high",
          reason: "Recommended for: Blood pressure management",
        },
      ],
    },
    {
      category: "Physical Activity",
      icon: Dumbbell,
      color: "text-green-600",
      bgColor: "bg-green-100",
      tips: [
        {
          title: "Moderate Exercise Routine",
          description: "Based on your glucose levels, aim for 150 minutes of moderate aerobic exercise per week. This can help improve insulin sensitivity.",
          importance: "high",
          reason: "Recommended for: Glucose control and diabetes prevention",
        },
        {
          title: "Post-Meal Walks",
          description: "Take a 15-minute walk after meals to help regulate blood sugar spikes and improve digestion.",
          importance: "medium",
          reason: "Recommended for: Glucose management",
        },
      ],
    },
    {
      category: "Sleep Optimization",
      icon: Moon,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
      tips: [
        {
          title: "Consistent Sleep Schedule",
          description: "Your wearable data shows irregular sleep patterns. Aim for 7-8 hours of sleep, going to bed and waking up at the same time daily.",
          importance: "medium",
          reason: "Recommended for: Overall health and glucose regulation",
        },
        {
          title: "Sleep Environment",
          description: "Keep your bedroom cool (65-68°F), dark, and quiet. Avoid screens 1 hour before bedtime to improve sleep quality.",
          importance: "medium",
          reason: "Recommended for: Better sleep quality",
        },
      ],
    },
    {
      category: "Cardiovascular Health",
      icon: Heart,
      color: "text-red-600",
      bgColor: "bg-red-100",
      tips: [
        {
          title: "Heart-Healthy Habits",
          description: "Your cholesterol levels are good. Maintain this by continuing omega-3 rich foods and regular cardiovascular exercise.",
          importance: "low",
          reason: "Maintenance for: Cardiovascular health",
        },
        {
          title: "Blood Pressure Monitoring",
          description: "Check your blood pressure weekly at the same time of day to track trends and catch any changes early.",
          importance: "medium",
          reason: "Recommended for: Hypertension prevention",
        },
      ],
    },
    {
      category: "Mental Wellness",
      icon: Smile,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      tips: [
        {
          title: "Gratitude Journaling",
          description: "Write down 3 things you're grateful for each day. This practice has been shown to reduce stress and improve mental health.",
          importance: "low",
          reason: "Recommended for: Stress reduction and mental health",
        },
        {
          title: "Social Connections",
          description: "Maintain regular social interactions. Strong social connections are linked to better health outcomes and longevity.",
          importance: "medium",
          reason: "Recommended for: Overall wellness",
        },
      ],
    },
    {
      category: "Mindfulness & Relaxation",
      icon: Leaf,
      color: "text-teal-600",
      bgColor: "bg-teal-100",
      tips: [
        {
          title: "Progressive Muscle Relaxation",
          description: "Practice tensing and relaxing muscle groups from head to toe. This can help reduce physical tension and lower blood pressure.",
          importance: "high",
          reason: "Recommended for: Blood pressure management and stress relief",
        },
        {
          title: "Nature Therapy",
          description: "Spend at least 20 minutes outdoors in nature daily. Studies show this reduces cortisol levels and improves mood.",
          importance: "medium",
          reason: "Recommended for: Stress reduction",
        },
      ],
    },
  ];

  const getImportanceColor = (importance: string) => {
    if (importance === "high") return "bg-red-100 text-red-800";
    if (importance === "medium") return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Wellness Tips</h1>
        <p className="text-gray-600 mt-1">Personalized wellness recommendations based on your health data</p>
      </div>

      <Alert className="mb-8 border-indigo-200 bg-indigo-50">
        <Sparkles className="h-4 w-4 text-indigo-600" />
        <AlertDescription className="text-indigo-900">
          These wellness tips are AI-generated based on your lab results, vitals, and health risk assessment.
          They're designed to complement your medical treatment and support your overall health goals.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        {personalizedTips.map((category, index) => {
          const Icon = category.icon;
          return (
            <Card key={index} className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${category.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${category.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{category.category}</CardTitle>
                    <CardDescription>{category.tips.length} personalized tips</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {category.tips.map((tip, tipIndex) => (
                    <div key={tipIndex} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-lg">{tip.title}</h4>
                        <Badge className={getImportanceColor(tip.importance)}>
                          {tip.importance}
                        </Badge>
                      </div>
                      <p className="text-gray-700 mb-3">{tip.description}</p>
                      <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
                        <p className="text-xs text-blue-800 font-medium">{tip.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 bg-gradient-to-r from-green-50 to-teal-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            Quick Daily Wellness Checklist
          </CardTitle>
          <CardDescription>Simple habits for better health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center text-white">✓</div>
              <span>10-15 minutes of meditation or deep breathing</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center text-white">✓</div>
              <span>30 minutes of physical activity</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center text-white">✓</div>
              <span>8 glasses of water</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center text-white">✓</div>
              <span>7-8 hours of sleep</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center text-white">✓</div>
              <span>5 servings of fruits and vegetables</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center text-white">✓</div>
              <span>Social connection or gratitude practice</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
