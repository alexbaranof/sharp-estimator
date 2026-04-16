import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  companyName: { fontSize: 18, fontWeight: 'bold', color: '#0D2137' },
  estimateTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 9, color: '#5F6E7A', marginBottom: 2 },
  value: { fontSize: 10, marginBottom: 12 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0D2137', padding: 6 },
  tableHeaderText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', padding: 6, borderBottomWidth: 0.5, borderColor: '#E5E7EB' },
  tableCell: { fontSize: 9 },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  totalLabel: { fontSize: 10, fontWeight: 'bold', color: '#0D2137' },
  totalValue: { fontSize: 10, fontWeight: 'bold', color: '#0D2137', width: 80, textAlign: 'right' },
})

export default function EstimateDocument({ estimate, company }) {
  const validUntil = new Date(estimate.created_at)
  validUntil.setDate(validUntil.getDate() + (estimate.validity_days || 30))

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            {company?.logo && (
              <Image
                src={company.logo}
                style={{ height: 40, marginBottom: 6, objectFit: 'contain' }}
              />
            )}
            <Text style={styles.companyName}>{company?.name || 'Company Name'}</Text>
            <Text style={{ fontSize: 9, color: '#5F6E7A' }}>{company?.address || ''}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#185FA5' }}>ESTIMATE</Text>
            <Text style={{ fontSize: 11 }}>{estimate.estimate_number}</Text>
            <Text style={{ fontSize: 9, color: '#5F6E7A' }}>{new Date(estimate.created_at).toLocaleDateString('en-GB')}</Text>
          </View>
        </View>

        {/* Project + Client details */}
        <View style={{ flexDirection: 'row', marginBottom: 24 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>PROJECT</Text>
            <Text style={styles.value}>{estimate.projects?.name}</Text>
            <Text style={styles.label}>ADDRESS</Text>
            <Text style={styles.value}>{estimate.projects?.address}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>CLIENT</Text>
            <Text style={styles.value}>{estimate.projects?.client_name}</Text>
            <Text style={styles.label}>VALID UNTIL</Text>
            <Text style={styles.value}>{validUntil.toLocaleDateString('en-GB')}</Text>
          </View>
        </View>

        {/* Document Title */}
        <Text style={styles.estimateTitle}>{estimate.title}</Text>

        {/* Company Contact Info */}
        <View style={{ marginBottom: 16, padding: 10, backgroundColor: '#F3F4F6', borderRadius: 4 }}>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            {company?.email && (
              <View>
                <Text style={[styles.label, { fontSize: 8 }]}>Email</Text>
                <Text style={{ fontSize: 9 }}>{company.email}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Scope of Work */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.label}>SCOPE OF WORK</Text>
          <Text style={{ fontSize: 10, marginBottom: 8, lineHeight: 1.5 }}>{estimate.scope}</Text>
        </View>

        {/* Line items table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 3 }]}>Description</Text>
          <Text style={[styles.tableHeaderText, { width: 35, textAlign: 'right' }]}>Qty</Text>
          <Text style={[styles.tableHeaderText, { width: 30, textAlign: 'center' }]}>Unit</Text>
          <Text style={[styles.tableHeaderText, { width: 55, textAlign: 'right' }]}>Rate £</Text>
          <Text style={[styles.tableHeaderText, { width: 60, textAlign: 'right' }]}>Total £</Text>
        </View>
        {estimate.line_items?.map((item, i) => (
          <View key={i} style={[styles.tableRow, i % 2 === 1 && { backgroundColor: '#F9FAFB' }]}>
            <Text style={[styles.tableCell, { flex: 3 }]}>{item.description}</Text>
            <Text style={[styles.tableCell, { width: 35, textAlign: 'right' }]}>{item.qty}</Text>
            <Text style={[styles.tableCell, { width: 30, textAlign: 'center' }]}>{item.unit}</Text>
            <Text style={[styles.tableCell, { width: 55, textAlign: 'right' }]}>{item.rate?.toFixed(2)}</Text>
            <Text style={[styles.tableCell, { width: 60, textAlign: 'right' }]}>{(item.qty * item.rate)?.toFixed(2)}</Text>
          </View>
        ))}

        {/* Grand Totals */}
        <View style={{ marginTop: 16, alignItems: 'flex-end' }}>
          {[
            ['Subtotal', `£${estimate.subtotal?.toFixed(2)}`],
            [`Markup (${estimate.markup_pct}%)`, `£${(estimate.subtotal * estimate.markup_pct / 100)?.toFixed(2)}`],
            [`VAT (${estimate.vat_pct}%)`, `£${((estimate.subtotal * (1 + estimate.markup_pct / 100)) * estimate.vat_pct / 100)?.toFixed(2)}`],
            ['TOTAL INC VAT', `£${estimate.total_inc_vat?.toFixed(2)}`],
          ].map(([label, value], i) => (
            <View key={i} style={styles.totalRow}>
              <Text style={[styles.totalLabel, { width: 120 }]}>{label}</Text>
              <Text style={styles.totalValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Time estimate */}
        {estimate.time_estimate > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.label}>ESTIMATED DURATION</Text>
            <Text style={{ fontSize: 10 }}>{estimate.time_estimate} working days</Text>
          </View>
        )}

        {/* Terms */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.label}>TERMS & CONDITIONS</Text>
          <Text style={{ fontSize: 8, color: '#5F6E7A', lineHeight: 1.5 }}>
            This estimate is valid for {estimate.validity_days || 30} days from the date of issue.
            Prices are based on current market rates and may be subject to change.
            Any additional works not included in this scope will be quoted separately.
            Payment terms: as agreed upon acceptance.
          </Text>
        </View>

        {/* Signature area */}
        <View style={{ marginTop: 30, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 20 }}>
            <Text style={styles.label}>CONTRACTOR</Text>
            <View style={{ borderBottomWidth: 1, borderColor: '#D1D5DB', marginTop: 40, marginBottom: 4 }} />
            <Text style={styles.label}>Signature / Date</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>CLIENT ACCEPTANCE</Text>
            <View style={{ borderBottomWidth: 1, borderColor: '#D1D5DB', marginTop: 40, marginBottom: 4 }} />
            <Text style={styles.label}>Signature / Date</Text>
          </View>
        </View>

        {estimate.notes && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.label}>NOTES / ASSUMPTIONS</Text>
            <Text style={{ fontSize: 9, color: '#5F6E7A', lineHeight: 1.5 }}>{estimate.notes}</Text>
          </View>
        )}

      </Page>
    </Document>
  )
}
