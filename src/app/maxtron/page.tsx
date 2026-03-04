'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [backendStatus, setBackendStatus] = useState('Checking...');

  useEffect(() => {
    setMounted(true);
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/health`)
      .then(res => res.json())
      .then(data => setBackendStatus(data.message))
      .catch(() => setBackendStatus('Backend Unreachable (Make sure it is running on port 5000)'));
  }, []);

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Overview</h2>
          <p className="text-foreground/60 mt-1">Welcome back, here's what's happening today.</p>
        </div>
        <div className="text-sm px-4 py-2 bg-accent text-accent-foreground rounded-full font-medium shadow-sm border border-accent/20">
          Backend Status: <span className={backendStatus.includes('healthy') ? 'text-green-600' : 'text-red-500'}>{backendStatus}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Sales', value: '$124,563.00', inc: '+12.5%', isPos: true },
          { label: 'Pending Orders', value: '1,432', inc: '+5.2%', isPos: true },
          { label: 'Total Production', value: '45,210', inc: '-2.4%', isPos: false },
          { label: 'Active Employees', value: '84', inc: '0.0%', isPos: true },
        ].map((stat, i) => (
          <Card key={i} className="relative overflow-hidden group hover:-translate-y-1 duration-200 border-border/50 shadow-sm hover:shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-accent to-transparent rounded-bl-full opacity-50 -z-10 group-hover:scale-110 transition-transform"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground/50 text-sm font-medium">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <div className={`mt-2 text-sm font-medium ${stat.isPos ? 'text-green-500' : 'text-red-500'}`}>
                {stat.inc} from last month
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-2 shadow-sm border-border/50 hover:border-accent transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold">Production Analytics</CardTitle>
            <Button variant="link" className="text-sm text-secondary font-medium">View Full Report</Button>
          </CardHeader>
          <CardContent>
            <div className="h-56 mt-4 flex items-center justify-center border-2 border-dashed border-border/50 rounded-xl bg-background/50">
              <p className="text-foreground/40 font-medium tracking-wide">Chart Visualization Area</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1 shadow-sm border-border/50 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 transition-transform group-hover:scale-125 duration-500"></div>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { title: 'Low Raw Material Stock', time: '10 mins ago', type: 'warning' },
              { title: 'New Bulk Order Received', time: '1 hour ago', type: 'success' },
              { title: 'Machine M-4 Maintenance', time: '3 hours ago', type: 'info' },
            ].map((alert, i) => (
              <div key={i} className="flex items-start p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border/50">
                <div className={`w-2 h-2 mt-2 rounded-full mr-3 flex-shrink-0 ${
                  alert.type === 'warning' ? 'bg-amber-500' : 
                  alert.type === 'success' ? 'bg-green-500' : 'bg-secondary'
                }`}></div>
                <div>
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <p className="text-xs text-foreground/50 mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
