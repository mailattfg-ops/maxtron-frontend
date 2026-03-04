import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Users, Settings } from 'lucide-react';

export default function KeilDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">KEIL Operations Dashboard</h1>
          <p className="text-foreground/60 mt-2">Welcome to the KEIL system module.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center text-primary">
              <Users className="w-5 h-5 mr-2 text-secondary" />
              Active Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">12</p>
            <p className="text-sm text-foreground/60 mt-2">Ongoing Projects</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center text-primary">
              <Settings className="w-5 h-5 mr-2 text-secondary" />
              Resource Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">85%</p>
            <p className="text-sm text-foreground/60 mt-2">Utilization Rate</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center text-primary">
              <Truck className="w-5 h-5 mr-2 text-secondary" />
              Transit Shipments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">4</p>
            <p className="text-sm text-foreground/60 mt-2">En Route</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
