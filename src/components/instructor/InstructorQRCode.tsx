import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QrCode, ArrowLeft, Copy, Check, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

const InstructorQRCode: React.FC = () => {
  const navigate = useNavigate();
  const { profile, license } = useAuth();
  const [copied, setCopied] = React.useState(false);
  const [instructorCref, setInstructorCref] = React.useState<string | null>(null);

  // Fetch instructor CREF from profiles table
  React.useEffect(() => {
    const fetchCref = async () => {
      if (profile?.profile_id) {
        const { data } = await supabase
          .from('profiles')
          .select('cref')
          .eq('id', profile.profile_id)
          .maybeSingle();
        
        if (data?.cref) {
          setInstructorCref(data.cref);
        }
      }
    };
    fetchCref();
  }, [profile?.profile_id]);

  const qrData = JSON.stringify({
    type: 'gym_instructor',
    profile_id: profile?.profile_id,
    username: profile?.username,
    name: profile?.full_name,
    cref: instructorCref
  });

  const handleCopyId = () => {
    if (profile?.profile_id) {
      navigator.clipboard.writeText(profile.profile_id);
      setCopied(true);
      toast.success('ID copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <QrCode className="w-6 h-6 text-green-500" />
          <h2 className="text-2xl font-bebas text-green-500 tracking-wider">MEU QR CODE</h2>
        </div>
        <Button variant="ghost" onClick={() => navigate('/instructor')}>
          <ArrowLeft size={18} className="mr-2" /> Voltar
        </Button>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* QR Code Card */}
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-8 border border-green-500/30 text-center">
          <div className="bg-white p-4 rounded-xl inline-block mb-4 shadow-lg">
            <QRCodeSVG
              value={qrData}
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>
          
          <h3 className="font-bebas text-xl tracking-wider text-foreground mb-2">
            {profile?.full_name || profile?.username}
          </h3>
          
          {instructorCref && (
            <p className="text-sm text-green-500 font-medium mb-2">
              CREF: {instructorCref}
            </p>
          )}
          
          <p className="text-sm text-muted-foreground">
            Alunos podem escanear este QR Code para se vincular a você automaticamente
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-border/50">
          <h3 className="font-bebas text-lg mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-500" />
            COMO FUNCIONA
          </h3>
          
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              Mostre este QR Code para seu aluno
            </p>
            <p className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              O aluno escaneia usando a opção "Escanear Instrutor" no app
            </p>
            <p className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              O vínculo é criado automaticamente
            </p>
          </div>
        </div>

        {/* ID Info */}
        {profile?.profile_id && (
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-border/50">
            <h3 className="font-bebas text-lg mb-4">MEU ID DE INSTRUTOR</h3>
            
            <div className="flex gap-2">
              <code className="flex-1 bg-background/50 px-3 py-2 rounded text-sm font-mono truncate">
                {profile.profile_id}
              </code>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleCopyId}
                className="shrink-0"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Alunos também podem usar este ID para encontrá-lo
            </p>
          </div>
        )}

        {/* License Info */}
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-border/50">
          <h3 className="font-bebas text-lg mb-4">INFORMAÇÕES</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nome</span>
              <span>{profile?.full_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Usuário</span>
              <span>@{profile?.username || '-'}</span>
            </div>
            {profile?.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="truncate ml-4">{profile.email}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                license?.status === 'active' 
                  ? 'bg-green-500/20 text-green-500' 
                  : 'bg-red-500/20 text-red-500'
              }`}>
                {license?.status === 'active' ? 'ATIVO' : 'INATIVO'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InstructorQRCode;
