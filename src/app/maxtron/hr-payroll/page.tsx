import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function HrPayrollPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-foreground">HR & Payroll</h2>
          <p className="text-foreground/60 mt-1">Manage employees, attendance, and salaries.</p>
        </div>
        <Button className="px-4 py-2 font-medium shadow-sm transition-colors">
          Run Payroll
        </Button>
      </div>

      <Card className="h-96 shadow-sm border-border/50">
        <CardContent className="h-full flex items-center justify-center p-6">
          <p className="text-foreground/40 font-medium">Employee Directory & Attendance</p>
        </CardContent>
      </Card>
    </div>
  );
}
