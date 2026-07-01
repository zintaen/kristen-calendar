import SwiftUI
import WidgetKit

struct LunarWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: LunarEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallView(entry: entry)
        case .systemMedium:
            MediumView(entry: entry)
        case .systemLarge:
            LargeView(entry: entry)
        default:
            SmallView(entry: entry)
        }
    }
}

// MARK: - Subviews

struct SmallView: View {
    let entry: LunarEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(entry.cache.lunarDayMonth)
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(Color(red: 0.24, green: 0.07, blue: 0.4)) // purple-900

            Text(entry.cache.canChiNgay)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Color(red: 0.49, green: 0.23, blue: 0.93)) // purple-600

            HStack {
                Text(entry.cache.label)
                    .font(.system(size: 12, weight: .bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(entry.cache.isHoangDao ? Color(red: 0.96, green: 0.73, blue: 0.09) : Color.gray.opacity(0.3)) // ochre vs gray
                    .foregroundColor(entry.cache.isHoangDao ? .white : Color(red: 0.24, green: 0.07, blue: 0.4))
                    .cornerRadius(4)
            }
            Spacer()
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color(red: 0.99, green: 0.96, blue: 0.93)) // cream-50
        .widgetURL(URL(string: "genieamlich://day-detail")!)
    }
}

struct MediumView: View {
    let entry: LunarEntry
    
    var body: some View {
        HStack {
            SmallView(entry: entry)
            
            VStack(alignment: .leading, spacing: 6) {
                Text("Trực \(entry.cache.trucName)")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Color(red: 0.24, green: 0.07, blue: 0.4))
                
                Text("Giờ Hoàng đạo:")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.gray)
                
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(entry.cache.gioHoangDao.filter { $0.isHoang }.prefix(3), id: \.canh) { gio in
                        Text("• \(gio.canh.split(separator: " ")[0]) (\(gio.tuGio)-\(gio.denGio))")
                            .font(.system(size: 12))
                            .foregroundColor(Color(red: 0.49, green: 0.23, blue: 0.93))
                    }
                }
                Spacer()
            }
            .padding()
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(Color(red: 0.99, green: 0.96, blue: 0.93))
        }
    }
}

struct LargeView: View {
    let entry: LunarEntry
    
    var body: some View {
        VStack {
            MediumView(entry: entry)
            
            VStack(alignment: .leading) {
                Text("Sao \(entry.cache.sao28Name)")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Color(red: 0.24, green: 0.07, blue: 0.4))
                    .padding(.horizontal)
                
                // Truncate list for widget size
                let hoangGios = entry.cache.gioHoangDao.filter { $0.isHoang }
                
                HStack(alignment: .top) {
                    VStack(alignment: .leading) {
                        ForEach(hoangGios.prefix(3), id: \.canh) { gio in
                            Text("\(gio.canh)")
                                .font(.system(size: 12))
                                .foregroundColor(Color(red: 0.49, green: 0.23, blue: 0.93))
                        }
                    }
                    Spacer()
                    VStack(alignment: .leading) {
                        ForEach(hoangGios.dropFirst(3).prefix(3), id: \.canh) { gio in
                            Text("\(gio.canh)")
                                .font(.system(size: 12))
                                .foregroundColor(Color(red: 0.49, green: 0.23, blue: 0.93))
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.bottom)
            }
            .frame(maxWidth: .infinity, alignment: .topLeading)
            .background(Color(red: 0.99, green: 0.96, blue: 0.93))
        }
    }
}
