import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog,
  DialogClose,
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { ShieldCheck, CheckCircle, PlusCircle } from 'lucide-react';

export const OpenBankingConnectCard = () => {
  return (
    <Card className="mb-6 bg-white border-gray-200 shadow-md rounded-lg overflow-hidden">
      <div className="h-1 bg-blue-500 w-full"></div>
      <CardContent className="p-5">
        <div className="flex items-start">
          <div className="bg-gray-50 p-2 rounded-full mr-3">
            <ShieldCheck className="h-6 w-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">Connect with Australia's CDR for real-time financial insights</h3>
            <p className="text-sm text-gray-600 mt-1">
              Link your accounts using Australia's secure Consumer Data Right (CDR) framework to unlock advanced analytics, 
              cash flow forecasting, and AI-driven financial recommendations. Access data from your bank securely without sharing passwords.
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-9 whitespace-nowrap ml-2">
                Connect Now
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle>Connect your financial accounts</DialogTitle>
                <DialogDescription>
                  Tap Loyalty uses secure open banking through Australia's Consumer Data Right (CDR) framework to provide data-driven insights.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <ShieldCheck className="w-4 h-4 mr-2 text-blue-500" />
                    Australia's CDR & Open Banking
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Powered by Australia's secure Consumer Data Right (CDR) framework, enabling you to safely share your financial data with trusted partners.
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1.5 text-green-600" />
                      ADR-accredited (Accredited Data Recipient)
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1.5 text-green-600" />
                      Read-only access with explicit consent
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1.5 text-green-600" />
                      ACCC and banking regulatory compliance
                    </li>
                  </ul>
                </div>
                <div className="p-4 border rounded-md bg-gray-50 border-gray-200">
                  <h4 className="text-sm font-medium mb-2 text-gray-900">How It Works</h4>
                  <ol className="text-xs text-gray-600 space-y-2 list-decimal pl-4">
                    <li>Connect your business bank account through our secure CDR portal</li>
                    <li>Authenticate directly with your bank - your credentials are never stored by Tap Loyalty</li>
                    <li>Set permissions for what data you want to share</li>
                    <li>Get immediate insights from your transaction data with AI-powered analytics</li>
                  </ol>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button className="w-full" variant="outline">
                    <img src="/bank-logos/anz-logo.png" alt="ANZ Bank" className="w-5 h-5 mr-2" />
                    ANZ
                  </Button>
                  <Button className="w-full" variant="outline">
                    <img src="/bank-logos/commbank-logo.png" alt="CommBank" className="w-5 h-5 mr-2" />
                    CommBank
                  </Button>
                  <Button className="w-full" variant="outline">
                    <img src="/bank-logos/westpac-logo.png" alt="Westpac" className="w-5 h-5 mr-2" />
                    Westpac
                  </Button>
                  <Button className="w-full" variant="outline">
                    <img src="/bank-logos/nab-logo.png" alt="NAB" className="w-5 h-5 mr-2" />
                    NAB
                  </Button>
                </div>
                <Button variant="outline" className="w-full text-gray-700">
                  View all CDR-supported institutions
                </Button>
              </div>
              <DialogFooter className="sm:justify-start">
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default OpenBankingConnectCard; 