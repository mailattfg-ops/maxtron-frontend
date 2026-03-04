import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Map, Download, Briefcase, Calendar } from 'lucide-react';

export default function MarketingReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Marketing Executive Visits</h1>
          <p className="text-foreground/60 mt-2">Analytics on field force movement and customer coverage.</p>
        </div>
        <Button className="bg-secondary text-white hover:bg-secondary/90">
          <Download className="w-4 h-4 mr-2" /> Export Logs
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <CardTitle className="text-xl flex items-center text-primary">
              <Map className="w-5 h-5 mr-3 text-secondary" />
              Visit History Log
            </CardTitle>
            <div className="flex space-x-2">
              <span className="text-xs font-semibold text-foreground/50 self-center">Filter:</span>
              <Input type="date" className="h-8 text-xs w-32" />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="border rounded-xl mx-2 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-primary/5 text-primary">
                  <tr>
                    <th className="p-4 font-semibold w-24">Date</th>
                    <th className="p-4 font-semibold w-24">Exec ID</th>
                    <th className="p-4 font-semibold">Client Visited</th>
                    <th className="p-4 font-semibold">Duration</th>
                    <th className="p-4 font-semibold">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-primary/5 transition-colors">
                    <td className="p-4 text-foreground/60">03 Mar, 2026</td>
                    <td className="p-4 font-medium text-secondary">MKT-001</td>
                    <td className="p-4 font-semibold">Polymer Tech Ltd.</td>
                    <td className="p-4">2 hr 15 mins</td>
                    <td className="p-4 text-foreground/70">North Industrial Hub</td>
                  </tr>
                  <tr className="hover:bg-primary/5 transition-colors">
                    <td className="p-4 text-foreground/60">03 Mar, 2026</td>
                    <td className="p-4 font-medium text-secondary">MKT-001</td>
                    <td className="p-4 font-semibold">MegaMart Supplies</td>
                    <td className="p-4">45 mins</td>
                    <td className="p-4 text-foreground/70">City Center</td>
                  </tr>
                  <tr className="hover:bg-primary/5 transition-colors">
                    <td className="p-4 text-foreground/60">03 Mar, 2026</td>
                    <td className="p-4 font-medium text-secondary">MKT-002</td>
                    <td className="p-4 font-semibold">Alpha Packaging</td>
                    <td className="p-4">1 hr 30 mins</td>
                    <td className="p-4 text-foreground/70">East Wing Estate</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Sidebar */}
        <div className="space-y-6">
          <Card className="bg-primary shadow text-primary-foreground border-none">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm font-semibold text-primary-foreground/70 flex items-center">
                 <Briefcase className="w-4 h-4 mr-2" /> Top Performer (Month)
               </CardTitle>
            </CardHeader>
            <CardContent>
               <h3 className="text-2xl font-bold">Alice Johnson</h3>
               <p className="text-sm mt-1">45 Client Visits Logged</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow border-primary/10">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm font-semibold text-foreground/60 flex items-center">
                 <Calendar className="w-4 h-4 mr-2 text-secondary" /> Avg. Time per Visit
               </CardTitle>
            </CardHeader>
            <CardContent>
               <h3 className="text-3xl font-bold text-primary">1h 12m</h3>
               <p className="text-xs text-secondary mt-1 tracking-wide font-medium border-t border-dashed mt-2 pt-2">Across all 14 field executives</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
