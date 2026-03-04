import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Download, Filter } from 'lucide-react';

export default function EmployeeListReport() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Employee Roster</h1>
          <p className="text-foreground/60 mt-2">Comprehensive directory of all HR-registered employees.</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="text-primary border-primary/20">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
          <Button className="bg-secondary text-white hover:bg-secondary/90">
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <CardTitle className="text-xl">Staff Directory</CardTitle>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 w-64 rounded-full" placeholder="Search by name, role, ID..." />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="border rounded-xl mx-2 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="p-4 font-semibold w-24">Emp ID</th>
                  <th className="p-4 font-semibold">Full Name</th>
                  <th className="p-4 font-semibold">Department</th>
                  <th className="p-4 font-semibold">Designation</th>
                  <th className="p-4 font-semibold">Date of Joining</th>
                  <th className="p-4 font-semibold">Contact Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* Mock Row 1 */}
                <tr className="hover:bg-primary/5 transition-colors">
                  <td className="p-4 font-medium text-secondary">EMP-001</td>
                  <td className="p-4 font-semibold text-foreground">John Doe</td>
                  <td className="p-4"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-bold">Production</span></td>
                  <td className="p-4 text-foreground/70">Extrusion Operator</td>
                  <td className="p-4">12 Jan, 2023</td>
                  <td className="p-4">+91 9876543210</td>
                </tr>

                {/* Mock Row 2 */}
                <tr className="hover:bg-primary/5 transition-colors">
                  <td className="p-4 font-medium text-secondary">EMP-002</td>
                  <td className="p-4 font-semibold text-foreground">Jane Smith</td>
                  <td className="p-4"><span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-bold">HR</span></td>
                  <td className="p-4 text-foreground/70">HR Manager</td>
                  <td className="p-4">05 Mar, 2021</td>
                  <td className="p-4">jane@maxtron.com</td>
                </tr>

                {/* Mock Row 3 */}
                <tr className="hover:bg-primary/5 transition-colors">
                  <td className="p-4 font-medium text-secondary">EMP-003</td>
                  <td className="p-4 font-semibold text-foreground">Ravi Patel</td>
                  <td className="p-4"><span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-bold">Sales</span></td>
                  <td className="p-4 text-foreground/70">Field Executive</td>
                  <td className="p-4">22 Aug, 2024</td>
                  <td className="p-4">+91 1234567890</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
