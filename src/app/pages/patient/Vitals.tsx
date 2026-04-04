import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Heart, Activity, Thermometer, Droplet, Wind } from "lucide-react";

export default function Vitals() {
  const currentVitals = [
    { icon: Heart, label: "Heart Rate", value: "72", unit: "bpm", status: "normal", color: "text-red-500" },
    { icon: Activity, label: "Blood Pressure", value: "120/80", unit: "mmHg", status: "normal", color: "text-blue-500" },
    { icon: Thermometer, label: "Temperature", value: "98.6", unit: "°F", status: "normal", color: "text-orange-500" },
    { icon: Droplet, label: "Oxygen Saturation", value: "98", unit: "%", status: "normal", color: "text-cyan-500" },
    { icon: Wind, label: "Respiratory Rate", value: "16", unit: "bpm", status: "normal", color: "text-teal-500" },
  ];

  const heartRateData = [
    { time: "00:00", value: 65 },
    { time: "04:00", value: 62 },
    { time: "08:00", value: 70 },
    { time: "12:00", value: 75 },
    { time: "16:00", value: 72 },
    { time: "20:00", value: 68 },
  ];

  const bloodPressureData = [
    { time: "00:00", systolic: 118, diastolic: 78 },
    { time: "04:00", systolic: 115, diastolic: 76 },
    { time: "08:00", systolic: 122, diastolic: 82 },
    { time: "12:00", systolic: 120, diastolic: 80 },
    { time: "16:00", systolic: 119, diastolic: 79 },
    { time: "20:00", systolic: 117, diastolic: 77 },
  ];

  const stepsData = [
    { day: "Mon", steps: 8500 },
    { day: "Tue", steps: 9200 },
    { day: "Wed", steps: 7800 },
    { day: "Thu", steps: 10500 },
    { day: "Fri", steps: 9800 },
    { day: "Sat", steps: 12000 },
    { day: "Sun", steps: 6500 },
  ];

  const sleepData = [
    { day: "Mon", hours: 7.5 },
    { day: "Tue", hours: 8.0 },
    { day: "Wed", hours: 6.5 },
    { day: "Thu", hours: 7.8 },
    { day: "Fri", hours: 7.2 },
    { day: "Sat", hours: 8.5 },
    { day: "Sun", hours: 8.0 },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Vitals from Wearables</h1>
        <p className="text-gray-600 mt-1">Real-time health data from your connected devices</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {currentVitals.map((vital, index) => {
          const Icon = vital.icon;
          return (
            <Card key={index}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${vital.color}`} />
                  <CardDescription className="text-xs">{vital.label}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-2xl font-bold">
                    {vital.value}
                    <span className="text-sm text-gray-500 ml-1">{vital.unit}</span>
                  </p>
                  <Badge className="mt-2 bg-green-100 text-green-800">
                    {vital.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="heartrate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="heartrate">Heart Rate</TabsTrigger>
          <TabsTrigger value="bp">Blood Pressure</TabsTrigger>
          <TabsTrigger value="steps">Activity</TabsTrigger>
          <TabsTrigger value="sleep">Sleep</TabsTrigger>
        </TabsList>

        <TabsContent value="heartrate">
          <Card>
            <CardHeader>
              <CardTitle>Heart Rate - Today</CardTitle>
              <CardDescription>Continuous monitoring from your wearable device</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={heartRateData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[50, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Heart Rate (bpm)"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Average</p>
                  <p className="text-xl font-bold">69 bpm</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Resting</p>
                  <p className="text-xl font-bold">62 bpm</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Max</p>
                  <p className="text-xl font-bold">75 bpm</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bp">
          <Card>
            <CardHeader>
              <CardTitle>Blood Pressure - Today</CardTitle>
              <CardDescription>Continuous monitoring from your wearable device</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={bloodPressureData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[60, 140]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="systolic"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Systolic"
                  />
                  <Line
                    type="monotone"
                    dataKey="diastolic"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Diastolic"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="steps">
          <Card>
            <CardHeader>
              <CardTitle>Steps - This Week</CardTitle>
              <CardDescription>Daily step count from your fitness tracker</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stepsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="steps"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Steps"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Daily Average</p>
                  <p className="text-xl font-bold">9,186 steps</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Weekly Goal</p>
                  <p className="text-xl font-bold">10,000 steps</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sleep">
          <Card>
            <CardHeader>
              <CardTitle>Sleep - This Week</CardTitle>
              <CardDescription>Sleep duration tracking from your wearable</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sleepData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Sleep Hours"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Average Sleep</p>
                  <p className="text-xl font-bold">7.6 hours</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Sleep Goal</p>
                  <p className="text-xl font-bold">8 hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
