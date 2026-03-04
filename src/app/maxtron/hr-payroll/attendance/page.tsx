import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Search, ListChecks } from 'lucide-react';

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Daily Attendance Logging</h1>
          <p className="text-foreground/60 mt-2">Log daily shift-wise attendance for manufacturing unit staff.</p>
        </div>
        <div className="flex space-x-3">
          <Input type="date" className="w-40" />
          <Button className="bg-primary hover:bg-primary/90 text-white">
            <ListChecks className="w-4 h-4 mr-2" /> Mark All Present
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl flex items-center">
            <Clock className="w-5 h-5 mr-3 text-secondary" />
            Shift Output Entry: Morning Shift
          </CardTitle>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 w-64" placeholder="Scan or search Employee ID..." />
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl mx-2 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-primary/5 text-primary">
                <tr>
                  <th className="p-4 font-semibold w-24">Emp ID</th>
                  <th className="p-4 font-semibold">Name & Role</th>
                  <th className="p-4 font-semibold">Shift In</th>
                  <th className="p-4 font-semibold">Shift Out</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* Mock Row 1 */}
                <tr className="hover:bg-primary/5 transition-colors">
                  <td className="p-4 font-medium">EMP-001</td>
                  <td className="p-4">
                    <div className="font-semibold text-foreground">John Doe</div>
                    <div className="text-xs text-secondary mt-0.5">Extrusion Operator</div>
                  </td>
                  <td className="p-4"><Input type="time" defaultValue="08:00" className="w-32 bg-background border-none shadow-sm" /></td>
                  <td className="p-4"><Input type="time" defaultValue="16:00" className="w-32 bg-background border-none shadow-sm" /></td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Present</span>
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="outline" size="sm" className="h-8">Update</Button>
                  </td>
                </tr>

                {/* Mock Row 2 */}
                <tr className="hover:bg-primary/5 transition-colors">
                  <td className="p-4 font-medium">EMP-002</td>
                  <td className="p-4">
                    <div className="font-semibold text-foreground">Jane Smith</div>
                    <div className="text-xs text-secondary mt-0.5">Packing Staff</div>
                  </td>
                  <td className="p-4"><Input type="time" defaultValue="" className="w-32 bg-background border-none shadow-sm" /></td>
                  <td className="p-4"><Input type="time" defaultValue="" className="w-32 bg-background border-none shadow-sm" /></td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Absent</span>
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="outline" size="sm" className="h-8">Update</Button>
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
