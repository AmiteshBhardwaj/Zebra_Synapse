import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Calendar, Clock, Video, MapPin, Plus } from "lucide-react";

export default function Appointments() {
  const [open, setOpen] = useState(false);

  const upcomingAppointments = [
    {
      id: 1,
      doctor: "Dr. Sarah Johnson",
      specialty: "Cardiologist",
      date: "2026-04-10",
      time: "10:00 AM",
      type: "video",
      status: "confirmed",
    },
    {
      id: 2,
      doctor: "Dr. Michael Chen",
      specialty: "Endocrinologist",
      date: "2026-04-15",
      time: "2:30 PM",
      type: "in-person",
      location: "Zebra Medical Center, Floor 3",
      status: "confirmed",
    },
  ];

  const pastAppointments = [
    {
      id: 3,
      doctor: "Dr. Emily Williams",
      specialty: "General Physician",
      date: "2026-03-20",
      time: "11:00 AM",
      type: "in-person",
      status: "completed",
    },
    {
      id: 4,
      doctor: "Dr. Sarah Johnson",
      specialty: "Cardiologist",
      date: "2026-02-14",
      time: "9:30 AM",
      type: "video",
      status: "completed",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600 mt-1">Manage your medical appointments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Appointment</DialogTitle>
              <DialogDescription>
                Choose a doctor and preferred time for your appointment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="doctor">Select Doctor</Label>
                <Select>
                  <SelectTrigger id="doctor">
                    <SelectValue placeholder="Choose a doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sarah">Dr. Sarah Johnson - Cardiologist</SelectItem>
                    <SelectItem value="michael">Dr. Michael Chen - Endocrinologist</SelectItem>
                    <SelectItem value="emily">Dr. Emily Williams - General Physician</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input id="time" type="time" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Appointment Type</Label>
                <Select>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video Consultation</SelectItem>
                    <SelectItem value="in-person">In-Person Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => setOpen(false)}>
                Confirm Appointment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>
          <div className="space-y-4">
            {upcomingAppointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-indigo-600">
                            {appointment.doctor.split(' ')[1][0]}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{appointment.doctor}</h3>
                          <p className="text-sm text-gray-500">{appointment.specialty}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">{appointment.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{appointment.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          {appointment.type === "video" ? (
                            <>
                              <Video className="w-4 h-4" />
                              <span className="text-sm">Video Consultation</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-4 h-4" />
                              <span className="text-sm">{appointment.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {appointment.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {appointment.type === "video" && (
                      <Button>Join Video Call</Button>
                    )}
                    <Button variant="outline">Reschedule</Button>
                    <Button variant="outline">Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Past Appointments</h2>
          <div className="space-y-4">
            {pastAppointments.map((appointment) => (
              <Card key={appointment.id} className="opacity-75">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-gray-600">
                            {appointment.doctor.split(' ')[1][0]}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{appointment.doctor}</h3>
                          <p className="text-sm text-gray-500">{appointment.specialty}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">{appointment.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{appointment.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          {appointment.type === "video" ? (
                            <>
                              <Video className="w-4 h-4" />
                              <span className="text-sm">Video Consultation</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-4 h-4" />
                              <span className="text-sm">In-Person</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-gray-100 text-gray-800">
                      {appointment.status}
                    </Badge>
                  </div>
                  <Button variant="outline" className="mt-4">
                    View Notes
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
