"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDao } from "@/hooks/useDao";
import { useAnchor } from "@/contexts/AnchorProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Calendar, Clock, Users as UsersIcon, CheckCircle2, XCircle } from "lucide-react";
import { BN } from "@coral-xyz/anchor";
import { TrackSession, formatTimestamp } from "@/lib/anchor/types";
import { toast } from "sonner";

export default function EventsPage() {
  const { connected } = useWallet();
  const { program } = useAnchor();
  const { createEvent, registerForEvent, withdrawFromEvent, fetchState } = useDao();
  const [events, setEvents] = useState<TrackSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (connected && program) {
      loadEvents();
    }
  }, [connected, program]);

  const loadEvents = async () => {
    if (!program) return;

    setLoading(true);
    try {
      const allEvents = await program.account.trackSession.all();
      setEvents(allEvents.map(e => e.account as any));
    } catch (error) {
      console.error("Error loading events:", error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDate || !eventTime || !description) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      const dateTime = new Date(`${eventDate}T${eventTime}`);
      const timestamp = Math.floor(dateTime.getTime() / 1000);

      await createEvent(timestamp, description);
      setCreateDialogOpen(false);
      setEventDate("");
      setEventTime("");
      setDescription("");
      await loadEvents();
    } catch (error) {
      console.error("Error creating event:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (eventId: BN) => {
    try {
      await registerForEvent(eventId);
      await loadEvents();
    } catch (error) {
      console.error("Error registering:", error);
    }
  };

  const handleWithdraw = async (eventId: BN) => {
    try {
      await withdrawFromEvent(eventId);
      await loadEvents();
    } catch (error) {
      console.error("Error withdrawing:", error);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Alert className="max-w-md">
          <AlertDescription>
            Please connect your wallet to view and manage events
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const upcomingEvents = events.filter(e => e.startTime.toNumber() > now && !e.isFinalized);
  const pastEvents = events.filter(e => e.startTime.toNumber() <= now || e.isFinalized);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Events</h1>
          <p className="text-muted-foreground">
            Participate in events to earn presence scores
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
              <DialogDescription>
                Schedule a new event for DAO members
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <Label htmlFor="eventDate">Event Date</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label htmlFor="eventTime">Event Time</Label>
                <Input
                  id="eventTime"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the event..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  maxLength={256}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {description.length}/256 characters
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Event
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Upcoming Events */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
            {upcomingEvents.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">No upcoming events</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingEvents.map((event) => {
                  const eventTime = event.startTime.toNumber();
                  const timeUntilEvent = eventTime - now;
                  const isWithin24h = timeUntilEvent < 86400;

                  return (
                    <Card key={event.id.toString()}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">
                            Event #{event.id.toString()}
                          </CardTitle>
                          <Badge variant={isWithin24h ? "destructive" : "default"}>
                            {isWithin24h ? "< 24h" : "Open"}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {event.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatTimestamp(event.startTime)}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <UsersIcon className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {event.registeredCount} registered · {event.attendedCount}{" "}
                            attended
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleRegister(event.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Register
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleWithdraw(event.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>

                        {isWithin24h && (
                          <Alert variant="destructive" className="py-2">
                            <AlertDescription className="text-xs">
                              Late registration/withdrawal will incur a penalty
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Events */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Past Events</h2>
            {pastEvents.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">No past events</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {pastEvents.map((event) => (
                  <Card key={event.id.toString()}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex-1">
                        <div className="font-medium">Event #{event.id.toString()}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {event.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          {formatTimestamp(event.startTime)}
                        </div>
                        <div className="text-sm">
                          {event.registeredCount} reg · {event.attendedCount} att
                        </div>
                        <Badge variant={event.isFinalized ? "secondary" : "outline"}>
                          {event.isFinalized ? "Finalized" : "In Progress"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
