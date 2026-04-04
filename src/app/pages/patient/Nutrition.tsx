import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Apple, Sparkles, TrendingUp, Utensils } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export default function Nutrition() {
  const dailyMacros = [
    { name: "Protein", value: 30, color: "#6366f1" },
    { name: "Carbs", value: 45, color: "#8b5cf6" },
    { name: "Fats", value: 25, color: "#ec4899" },
  ];

  const mealPlan = [
    {
      meal: "Breakfast",
      time: "7:00 AM - 8:00 AM",
      items: [
        "Oatmeal with berries and almonds",
        "Greek yogurt (low-fat)",
        "Green tea",
      ],
      calories: 350,
      benefits: "High fiber helps regulate blood sugar",
    },
    {
      meal: "Mid-Morning Snack",
      time: "10:00 AM",
      items: [
        "Apple with almond butter",
        "Handful of walnuts",
      ],
      calories: 200,
      benefits: "Omega-3 fatty acids support heart health",
    },
    {
      meal: "Lunch",
      time: "12:30 PM - 1:30 PM",
      items: [
        "Grilled chicken breast",
        "Quinoa salad with mixed vegetables",
        "Olive oil dressing",
      ],
      calories: 500,
      benefits: "Lean protein and complex carbs for sustained energy",
    },
    {
      meal: "Afternoon Snack",
      time: "4:00 PM",
      items: [
        "Carrot sticks with hummus",
        "Herbal tea",
      ],
      calories: 150,
      benefits: "Low-calorie, nutrient-dense snack",
    },
    {
      meal: "Dinner",
      time: "7:00 PM - 8:00 PM",
      items: [
        "Baked salmon",
        "Steamed broccoli and asparagus",
        "Sweet potato",
      ],
      calories: 550,
      benefits: "Omega-3s and antioxidants reduce inflammation",
    },
  ];

  const nutritionTips = [
    {
      title: "Increase Fiber Intake",
      description: "Based on your glucose levels, aim for 25-30g of fiber daily to help regulate blood sugar",
      priority: "high",
    },
    {
      title: "Reduce Sodium",
      description: "Limit sodium to 2,300mg per day to support healthy blood pressure",
      priority: "medium",
    },
    {
      title: "Omega-3 Fatty Acids",
      description: "Include fatty fish 2-3 times per week to support cardiovascular health",
      priority: "medium",
    },
    {
      title: "Stay Hydrated",
      description: "Drink 8-10 glasses of water daily to support kidney function and overall health",
      priority: "high",
    },
  ];

  const getPriorityColor = (priority: string) => {
    if (priority === "high") return "bg-red-100 text-red-800";
    if (priority === "medium") return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nutrition Plan</h1>
        <p className="text-gray-600 mt-1">AI-personalized nutrition recommendations based on your lab reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <CardTitle>Daily Meal Plan</CardTitle>
            </div>
            <CardDescription>Customized based on your health goals and lab results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mealPlan.map((meal, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-lg">{meal.meal}</h4>
                      <p className="text-sm text-gray-500">{meal.time}</p>
                    </div>
                    <Badge variant="outline">{meal.calories} cal</Badge>
                  </div>
                  <ul className="space-y-1 mb-3">
                    {meal.items.map((item, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                        <Utensils className="w-3 h-3 text-gray-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="bg-green-50 border border-green-200 rounded p-2">
                    <p className="text-xs text-green-800 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {meal.benefits}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-900 font-medium">Total Daily Calories</p>
                  <p className="text-2xl font-bold text-indigo-600">1,750 cal</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-indigo-900">Recommended Range</p>
                  <p className="text-sm font-medium text-indigo-600">1,700 - 2,000 cal</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Macronutrient Balance</CardTitle>
              <CardDescription>Daily recommended distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={dailyMacros}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dailyMacros.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Protein</span>
                  <span className="font-medium">131g (30%)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Carbohydrates</span>
                  <span className="font-medium">197g (45%)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Fats</span>
                  <span className="font-medium">49g (25%)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Targets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Water Intake</span>
                  <span className="text-sm font-medium">6/8 glasses</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Fiber</span>
                  <span className="text-sm font-medium">22/30g</span>
                </div>
                <Progress value={73} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Vegetables</span>
                  <span className="text-sm font-medium">4/5 servings</span>
                </div>
                <Progress value={80} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Apple className="w-5 h-5 text-green-600" />
            <CardTitle>Personalized Nutrition Tips</CardTitle>
          </div>
          <CardDescription>Based on your current health markers and goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nutritionTips.map((tip, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{tip.title}</h4>
                  <Badge className={getPriorityColor(tip.priority)}>
                    {tip.priority}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{tip.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
