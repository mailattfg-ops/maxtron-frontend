import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, CalendarDays, LineChart } from 'lucide-react';

export default function AttendanceReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Attendance Summary</h1>
          <p className="text-foreground/60 mt-2">Date-range attendance summaries and analytics.</p>
        </div>
        <Button className="bg-secondary text-white hover:bg-secondary/90">
          <Download className="w-4 h-4 mr-2" /> Download Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-primary text-primary-foreground shadow-lg border-none relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-4xl font-extrabold">94%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-primary-foreground/90">Present Today</p>
          </CardContent>
          <LineChart className="w-24 h-24 absolute -right-4 -bottom-4 text-white/10" />
        </Card>
        
        <Card className="bg-white shadow border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-4xl font-extrabold text-secondary">3</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-foreground/70">Absent / On Leave</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-4xl font-extrabold text-orange-500">2</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-foreground/70">Late Arrivals</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <CardTitle className="text-xl flex items-center">
            <CalendarDays className="w-5 h-5 mr-3 text-secondary" />
            Filtered Roster
          </CardTitle>
          <div className="flex items-center space-x-3">
             <span className="text-sm font-semibold text-foreground/50">Date Range:</span>
             <Input type="date" className="rounded-md w-36 h-9" />
             <span className="text-sm font-semibold text-foreground/50">to</span>
             <Input type="date" className="rounded-md w-36 h-9" />
             <Button size="sm" variant="outline">Apply</Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="border rounded-xl mx-2 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-primary/5 text-primary">
                <tr>
                  <th className="p-4 font-semibold w-24">Date</th>
                  <th className="p-4 font-semibold w-24">Emp ID</th>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Shift In</th>
                  <th className="p-4 font-semibold">Shift Out</th>
                  <th className="p-4 font-semibold">Daily Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-primary/5 transition-colors">
                  <td className="p-4 text-foreground/60">03 Mar, 2026</td>
                  <td className="p-4 font-medium text-secondary">EMP-001</td>
                  <td className="p-4 font-semibold">John Doe</td>
                  <td className="p-4">08:00 AM</td>
                  <td className="p-4">04:05 PM</td>
                  <td className="p-4">
                     <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold uppercase tracking-wider">Present</span>
                  </td>
                </tr>
                <tr className="hover:bg-primary/5 transition-colors">
                  <td className="p-4 text-foreground/60">03 Mar, 2026</td>
                  <td className="p-4 font-medium text-secondary">EMP-002</td>
                  <td className="p-4 font-semibold">Jane Smith</td>
                  <td className="p-4">-</td>
                  <td className="p-4">-</td>
                  <td className="p-4">
                     <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold uppercase tracking-wider">Absent</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
