import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Send } from 'lucide-react';

export default function MarketingVisitsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Marketing Team Visits</h1>
          <p className="text-foreground/60 mt-2">Punch in field staff location, customer contact info, and time logs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl flex items-center text-primary">
              <Navigation className="w-5 h-5 mr-3" />
              Log Customer Visit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Select Employee</label>
                <select className="w-full p-2.5 rounded-xl border border-foreground/10 bg-background focus:ring-2 focus:ring-secondary/50 outline-none">
                  <option>MKT-001 | Alice Johnson</option>
                  <option>MKT-002 | Bob Richards</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Customer Name</label>
                <Input placeholder="Enter visited customer's business..." />
              </div>
            </div>

            <div className="space-y-2 relative">
              <label className="text-sm font-medium text-foreground/80">Location Pinned</label>
              <div className="relative">
                <Input defaultValue="MG Road, Industrial District Phase 2" className="pl-10" />
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                <Button size="sm" variant="secondary" className="absolute right-1 top-1 h-8">
                  Get Current Location
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Time In</label>
                <Input type="time" defaultValue="09:15" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Time Out</label>
                <Input type="time" defaultValue="11:30" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">Meeting Notes / Outcomes</label>
              <textarea 
                className="w-full p-3 rounded-xl border border-foreground/10 bg-background min-h-[100px] resize-y focus:ring-2 focus:ring-secondary/50 outline-none"
                placeholder="Discussed new polybag specifications and quoted a price drop..."
              ></textarea>
            </div>

            <Button className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90">
              <Send className="w-4 h-4 mr-2" /> Submit Visit Log
            </Button>
          </CardContent>
        </Card>

        {/* Info or latest updates panel */}
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg">Today's Highlights</CardTitle>
          </CardHeader>
          <CardContent>
             <ul className="space-y-4">
                <li className="flex items-start space-x-3">
                   <div className="w-2 h-2 mt-2 bg-secondary rounded-full"></div>
                   <div>
                      <p className="text-sm font-semibold">Alice Johnson</p>
                      <p className="text-xs text-foreground/60">Visited 3 clients in South Sector. Current status: Transit.</p>
                   </div>
                </li>
                <li className="flex items-start space-x-3">
                   <div className="w-2 h-2 mt-2 bg-secondary rounded-full"></div>
                   <div>
                      <p className="text-sm font-semibold">Bob Richards</p>
                      <p className="text-xs text-foreground/60">Meeting at MegaMart HQ. Checked in 45 mins ago.</p>
                   </div>
                </li>
             </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
