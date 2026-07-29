import { useEffect } from 'react';
import { Button, Card, Form, Input, Typography } from 'antd';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../services/api';
import { pageCardStyle as cardStyle, pageHeaderStyle as headerStyle, pageWrapStyle } from '../layout/pageStyles';

const { Paragraph, Text, Title } = Typography;

export default function Settings() {
  const qc = useQueryClient();
  const [form] = Form.useForm();

  const settingsQ = useQuery({
    queryKey: ['hotel-settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data.settings;
    },
  });

  useEffect(() => {
    const s = settingsQ.data;
    if (!s) return;
    form.setFieldsValue({
      property_name: s.property_name ?? '',
      timezone: s.timezone ?? '',
      default_check_in: s.default_check_in ?? '',
      default_check_out: s.default_check_out ?? '',
    });
  }, [settingsQ.data, form]);

  useEffect(() => {
    if (!settingsQ.isError) return;
    toast.error(settingsQ.error?.response?.data?.message || 'Could not load settings.');
  }, [settingsQ.isError, settingsQ.error]);

  const save = useMutation({
    mutationFn: async (vals) =>
      api.put('/settings', {
        property_name: vals.property_name?.trim(),
        timezone: vals.timezone?.trim(),
        default_check_in: vals.default_check_in?.trim(),
        default_check_out: vals.default_check_out?.trim(),
      }),
    onSuccess: (res) => {
      qc.setQueryData(['hotel-settings'], () => res.data.settings);
      toast.success('Settings saved.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Could not save settings.');
    },
  });

  const updatedLabel = settingsQ.data?.updated_at
    ? dayjs(settingsQ.data.updated_at).format('MMM D YYYY HH:mm')
    : null;

  return (
    <div style={{ ...pageWrapStyle, maxWidth: 640 }}>
      <Card bordered={false} style={cardStyle} styles={{ header: headerStyle }} title="Property settings">
        <Paragraph type="secondary">
          Used across the property for signage and scheduling. Your team sees these defaults in reservation flows.
        </Paragraph>
        {updatedLabel && (
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Last updated {updatedLabel}
          </Text>
        )}
        <Title level={5} style={{ marginBottom: 12 }}>
          Labels & timings
        </Title>
        <Form layout="vertical" form={form} onFinish={(v) => save.mutate(v)}>
          <Form.Item name="property_name" label="Property display name">
            <Input placeholder="e.g. Addis Riviera Hotel" />
          </Form.Item>
          <Form.Item name="timezone" label="Timezone">
            <Input placeholder="Africa/Addis_Ababa" />
          </Form.Item>
          <Form.Item name="default_check_in" label="Default check-in time">
            <Input placeholder="15:00" />
          </Form.Item>
          <Form.Item name="default_check_out" label="Default check-out time">
            <Input placeholder="11:00" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={save.isPending || settingsQ.isLoading} block>
            Save changes
          </Button>
        </Form>
      </Card>
    </div>
  );
}
